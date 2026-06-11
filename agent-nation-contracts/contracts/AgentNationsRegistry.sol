// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AgentNationsRegistry
 * @author Agent Nations
 * @notice On-chain state registry for the Agent Nations multi-agent governance simulator.
 *         Three nations — Tech, Trade, and Military — compete and cooperate across
 *         simulation cycles driven by AI governors and ministers off-chain.
 * @dev Only addresses holding EXECUTOR_ROLE may mutate state. All read functions are
 *      public and cost no gas when called off-chain via `eth_call`.
 */
contract AgentNationsRegistry is AccessControl {
    // =========================================================================
    // Constants & Roles
    // =========================================================================

    /// @notice Role granted to the backend executor wallet that submits AI decisions.
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    /// @notice Total number of nations in the simulation. Fixed at 3.
    uint8 public constant NATION_COUNT = 3;

    /// @dev Nation indices — used for readability in internal logic.
    uint8 private constant TECH_NATION     = 0;
    uint8 private constant TRADE_NATION    = 1;
    uint8 private constant MILITARY_NATION = 2;

    // =========================================================================
    // Types
    // =========================================================================

    /**
     * @notice The five actions an AI governor may execute on behalf of a nation.
     * @dev The enum value is stored as uint8 in Nation.lastAction to save gas.
     *
     *   INVEST_IN_TECH   — Spend treasury to raise tech score.
     *   BUILD_MILITARY   — Spend treasury to raise military score.
     *   FORM_ALLIANCE    — Raise own diplomacy score through goodwill.
     *   COLLECT_TRIBUTE  — Raise treasury; economic consolidation.
     *   LAUNCH_ESPIONAGE — Raise own tech score; lower a target nation's tech score.
     */
    enum Action {
        INVEST_IN_TECH,
        BUILD_MILITARY,
        FORM_ALLIANCE,
        COLLECT_TRIBUTE,
        LAUNCH_ESPIONAGE
    }

    /**
     * @notice Full state for one nation.
     * @param name            Human-readable name (e.g. "Tech Nation").
     * @param treasury        Gold / resource units available for spending.
     * @param techScore       Technology advancement level.
     * @param militaryScore   Military strength level.
     * @param diplomacyScore  Diplomatic influence level.
     * @param lastAction      The Action enum value executed last cycle (stored as uint8).
     */
    struct Nation {
        string  name;
        uint256 treasury;
        uint16  techScore;
        uint16  militaryScore;
        uint16  diplomacyScore;
        uint8   lastAction;
    }

    // =========================================================================
    // State Variables
    // =========================================================================

    /// @notice Monotonically increasing simulation cycle counter.
    uint256 public currentCycle;

    /// @notice Fixed-length array holding all three nation states.
    /// @dev Index 0 = Tech Nation, 1 = Trade Nation, 2 = Military Nation.
    Nation[NATION_COUNT] private _nations;

    // =========================================================================
    // Action Parameter Constants
    // =========================================================================
    // Keeping these as constants rather than storage variables saves ~20k gas
    // on deployment and ~200 gas per read versus SLOAD.

    uint256 private constant INVEST_TECH_COST        = 100;
    uint16  private constant INVEST_TECH_GAIN        = 15;

    uint256 private constant BUILD_MILITARY_COST     = 100;
    uint16  private constant BUILD_MILITARY_GAIN     = 15;

    uint16  private constant FORM_ALLIANCE_DIPLOMACY = 20;

    uint256 private constant COLLECT_TRIBUTE_GAIN   = 150;

    uint256 private constant ESPIONAGE_COST          = 50;
    uint16  private constant ESPIONAGE_SELF_GAIN     = 10;
    uint16  private constant ESPIONAGE_TARGET_LOSS   = 5;

    // =========================================================================
    // Events
    // =========================================================================

    /**
     * @notice Emitted whenever an AI governor executes an action for a nation.
     * @param cycle      The cycle number during which this action occurred.
     * @param nationIdx  Index of the acting nation (0, 1, or 2).
     * @param action     The Action enum value that was executed.
     * @param targetIdx  Index of the targeted nation; 255 if no target applies.
     */
    event ActionExecuted(
        uint256 indexed cycle,
        uint8   indexed nationIdx,
        Action          action,
        uint8           targetIdx
    );

    /**
     * @notice Emitted when the simulation advances to a new cycle.
     * @param newCycle The updated cycle number.
     */
    event CycleAdvanced(uint256 indexed newCycle);

    /**
     * @notice Emitted when the contract is initialised with starting nation states.
     * @param deployer Address that deployed and initialised the contract.
     */
    event Initialised(address indexed deployer);

    // =========================================================================
    // Custom Errors
    // =========================================================================

    /// @notice Thrown when a nation index is out of the 0-2 range.
    error InvalidNationIndex(uint8 nationIdx);

    /// @notice Thrown when LAUNCH_ESPIONAGE is given an invalid or self-targeting index.
    error InvalidTarget(uint8 targetIdx);

    /// @notice Thrown when a nation cannot afford the treasury cost of an action.
    error InsufficientTreasury(uint8 nationIdx, uint256 required, uint256 available);

    // =========================================================================
    // Constructor
    // =========================================================================

    /**
     * @notice Deploys the registry, seeds the three nations with starting stats,
     *         and grants DEFAULT_ADMIN_ROLE to the deployer and EXECUTOR_ROLE to
     *         the provided executor address.
     * @param executor Address of the backend hot wallet that will submit AI decisions.
     *                 May be the same as the deployer during development.
     */
    constructor(address executor) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, executor);

        // ---- Tech Nation (index 0) ----
        _nations[TECH_NATION] = Nation({
            name:           "Tech Nation",
            treasury:       1000,
            techScore:      70,
            militaryScore:  40,
            diplomacyScore: 50,
            lastAction:     uint8(Action.COLLECT_TRIBUTE)
        });

        // ---- Trade Nation (index 1) ----
        _nations[TRADE_NATION] = Nation({
            name:           "Trade Nation",
            treasury:       1200,
            techScore:      50,
            militaryScore:  40,
            diplomacyScore: 60,
            lastAction:     uint8(Action.COLLECT_TRIBUTE)
        });

        // ---- Military Nation (index 2) ----
        _nations[MILITARY_NATION] = Nation({
            name:           "Military Nation",
            treasury:       900,
            techScore:      40,
            militaryScore:  70,
            diplomacyScore: 40,
            lastAction:     uint8(Action.COLLECT_TRIBUTE)
        });

        currentCycle = 0;

        emit Initialised(msg.sender);
    }

    // =========================================================================
    // Read Functions (Public / View)
    // =========================================================================

    /**
     * @notice Returns the full state of all three nations in a single call.
     * @dev Prefer this over three individual `getNation` calls to minimise RPC
     *      round-trips. Returning a fixed-size array avoids ABI encoding overhead
     *      of a dynamic array.
     * @return nations A fixed-size array of three Nation structs:
     *                 [0] Tech Nation, [1] Trade Nation, [2] Military Nation.
     */
    function getAllStates() external view returns (Nation[NATION_COUNT] memory nations) {
        nations = _nations;
    }

    /**
     * @notice Returns the state of a single nation by index.
     * @param nationIdx Index of the nation (0 = Tech, 1 = Trade, 2 = Military).
     * @return The Nation struct for the requested nation.
     */
    function getNation(uint8 nationIdx) external view returns (Nation memory) {
        _requireValidNation(nationIdx);
        return _nations[nationIdx];
    }

    /**
     * @notice Returns the current simulation cycle number.
     * @return The value of `currentCycle`.
     */
    function getCycleNumber() external view returns (uint256) {
        return currentCycle;
    }

    // =========================================================================
    // Write Functions (EXECUTOR_ROLE only)
    // =========================================================================

    /**
     * @notice Executes an AI-selected action for one nation, mutating its stats
     *         and optionally those of a target nation.
     * @dev Called by the backend once per nation per cycle, in series to avoid
     *      nonce collisions. The `targetIdx` parameter is ignored for all actions
     *      except LAUNCH_ESPIONAGE; pass 255 (or any value) for non-targeting actions.
     *
     * Action effects:
     *  INVEST_IN_TECH   : treasury  -= 100,  techScore      += 15
     *  BUILD_MILITARY   : treasury  -= 100,  militaryScore  += 15
     *  FORM_ALLIANCE    : diplomacyScore     += 20  (no treasury cost)
     *  COLLECT_TRIBUTE  : treasury  += 150
     *  LAUNCH_ESPIONAGE : treasury  -= 50,   self.techScore += 10,
     *                     target.techScore   -= 5  (floored at 0)
     *
     * @param nationIdx Index of the acting nation (0-2).
     * @param action    The Action enum value selected by the AI governor.
     * @param targetIdx Index of the target nation (0-2). Only meaningful for
     *                  LAUNCH_ESPIONAGE; ignored (safe to pass 255) otherwise.
     */
    function executeAction(
        uint8  nationIdx,
        Action action,
        uint8  targetIdx
    ) external onlyRole(EXECUTOR_ROLE) {
        _requireValidNation(nationIdx);

        if (action == Action.INVEST_IN_TECH) {
            _investInTech(nationIdx);
        } else if (action == Action.BUILD_MILITARY) {
            _buildMilitary(nationIdx);
        } else if (action == Action.FORM_ALLIANCE) {
            _formAlliance(nationIdx);
        } else if (action == Action.COLLECT_TRIBUTE) {
            _collectTribute(nationIdx);
        } else {
            // Action.LAUNCH_ESPIONAGE — validate target before delegating
            _requireValidTarget(nationIdx, targetIdx);
            _launchEspionage(nationIdx, targetIdx);
        }

        _nations[nationIdx].lastAction = uint8(action);

        emit ActionExecuted(currentCycle, nationIdx, action, targetIdx);
    }

    /**
     * @notice Advances the simulation to the next cycle.
     * @dev Called once per simulation cycle by the backend after all three nations
     *      have had their actions executed. Incrementing here ensures the cycle
     *      number reflects a fully settled state before the next read phase.
     */
    function advanceCycle() external onlyRole(EXECUTOR_ROLE) {
        ++currentCycle;
        emit CycleAdvanced(currentCycle);
    }

    // =========================================================================
    // Admin Functions (DEFAULT_ADMIN_ROLE only)
    // =========================================================================

    /**
     * @notice Grants EXECUTOR_ROLE to a new backend wallet.
     * @dev The admin should revoke the old executor after granting the new one
     *      to ensure a single active executor at any time.
     * @param newExecutor Address to grant EXECUTOR_ROLE to.
     */
    function setExecutor(address newExecutor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(EXECUTOR_ROLE, newExecutor);
    }

    /**
     * @notice Revokes EXECUTOR_ROLE from a given address.
     * @param oldExecutor Address to revoke EXECUTOR_ROLE from.
     */
    function revokeExecutor(address oldExecutor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(EXECUTOR_ROLE, oldExecutor);
    }

    /**
     * @notice Resets all nation stats and the cycle counter to initial values.
     * @dev Useful for resetting the simulation between demo runs without
     *      redeploying the contract.
     */
    function resetSimulation() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _nations[TECH_NATION].treasury       = 1000;
        _nations[TECH_NATION].techScore      = 70;
        _nations[TECH_NATION].militaryScore  = 40;
        _nations[TECH_NATION].diplomacyScore = 50;
        _nations[TECH_NATION].lastAction     = uint8(Action.COLLECT_TRIBUTE);

        _nations[TRADE_NATION].treasury       = 1200;
        _nations[TRADE_NATION].techScore      = 50;
        _nations[TRADE_NATION].militaryScore  = 40;
        _nations[TRADE_NATION].diplomacyScore = 60;
        _nations[TRADE_NATION].lastAction     = uint8(Action.COLLECT_TRIBUTE);

        _nations[MILITARY_NATION].treasury       = 900;
        _nations[MILITARY_NATION].techScore      = 40;
        _nations[MILITARY_NATION].militaryScore  = 70;
        _nations[MILITARY_NATION].diplomacyScore = 40;
        _nations[MILITARY_NATION].lastAction     = uint8(Action.COLLECT_TRIBUTE);

        currentCycle = 0;
    }

    // =========================================================================
    // Internal Action Handlers
    // =========================================================================

    /**
     * @dev INVEST_IN_TECH: Deducts treasury and raises tech score.
     *      Reverts if treasury is insufficient.
     */
    function _investInTech(uint8 nationIdx) private {
        Nation storage n = _nations[nationIdx];
        if (n.treasury < INVEST_TECH_COST) {
            revert InsufficientTreasury(nationIdx, INVEST_TECH_COST, n.treasury);
        }
        unchecked {
            n.treasury  -= INVEST_TECH_COST;
            n.techScore += INVEST_TECH_GAIN;
        }
    }

    /**
     * @dev BUILD_MILITARY: Deducts treasury and raises military score.
     *      Reverts if treasury is insufficient.
     */
    function _buildMilitary(uint8 nationIdx) private {
        Nation storage n = _nations[nationIdx];
        if (n.treasury < BUILD_MILITARY_COST) {
            revert InsufficientTreasury(nationIdx, BUILD_MILITARY_COST, n.treasury);
        }
        unchecked {
            n.treasury      -= BUILD_MILITARY_COST;
            n.militaryScore += BUILD_MILITARY_GAIN;
        }
    }

    /**
     * @dev FORM_ALLIANCE: Raises diplomacy score at no treasury cost.
     *      Represents the nation projecting soft power and seeking partnerships.
     */
    function _formAlliance(uint8 nationIdx) private {
        unchecked {
            _nations[nationIdx].diplomacyScore += FORM_ALLIANCE_DIPLOMACY;
        }
    }

    /**
     * @dev COLLECT_TRIBUTE: Increases treasury. Represents baseline economic
     *      activity or tribute collection from minor states.
     */
    function _collectTribute(uint8 nationIdx) private {
        unchecked {
            _nations[nationIdx].treasury += COLLECT_TRIBUTE_GAIN;
        }
    }

    /**
     * @dev LAUNCH_ESPIONAGE: Actor pays treasury cost, gains tech, and reduces
     *      the target nation's tech score. The target's techScore is floored at 0
     *      rather than reverting, preventing a griefing vector where a nation with
     *      zero tech could block all espionage actions against it.
     */
    function _launchEspionage(uint8 nationIdx, uint8 targetIdx) private {
        Nation storage actor  = _nations[nationIdx];
        Nation storage target = _nations[targetIdx];

        if (actor.treasury < ESPIONAGE_COST) {
            revert InsufficientTreasury(nationIdx, ESPIONAGE_COST, actor.treasury);
        }

        unchecked {
            actor.treasury  -= ESPIONAGE_COST;
            actor.techScore += ESPIONAGE_SELF_GAIN;
        }

        // Floor at 0 to avoid underflow without reverting the entire cycle.
        if (target.techScore >= ESPIONAGE_TARGET_LOSS) {
            unchecked {
                target.techScore -= ESPIONAGE_TARGET_LOSS;
            }
        } else {
            target.techScore = 0;
        }
    }

    // =========================================================================
    // Internal Validation Helpers
    // =========================================================================

    /// @dev Reverts with InvalidNationIndex if `nationIdx` >= NATION_COUNT.
    function _requireValidNation(uint8 nationIdx) private pure {
        if (nationIdx >= NATION_COUNT) {
            revert InvalidNationIndex(nationIdx);
        }
    }

    /**
     * @dev Reverts with InvalidTarget if `targetIdx` is out of range or equals
     *      the acting nation index. A nation cannot spy on itself.
     */
    function _requireValidTarget(uint8 nationIdx, uint8 targetIdx) private pure {
        if (targetIdx >= NATION_COUNT || targetIdx == nationIdx) {
            revert InvalidTarget(targetIdx);
        }
    }
}
