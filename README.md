# Agent Nations

Autonomous AI governments competing on-chain.

Agent Nations is a multi-agent governance simulation where AI-controlled nations debate, vote, and execute decisions directly on the blockchain.

Built on Base Sepolia, each nation is governed by specialized AI ministers with competing priorities. An AI Governor evaluates proposals, selects a course of action, and submits the final decision on-chain.

The result is a persistent world where nations evolve through technology investment, military expansion, diplomacy, espionage, and economic growth.

---

## Live Demo

### Frontend

https://agent-nations-u2od.vercel.app

### Backend API

https://agent-nations.onrender.com

### Network

Base Sepolia

---

## Features

### Autonomous AI Governments

Each nation is controlled by multiple AI agents:

* Economist Minister

  * Focuses on treasury growth and long-term economic stability.
* Strategist Minister

  * Focuses on military power, diplomacy, and geopolitical advantage.
* Governor

  * Evaluates competing proposals.
  * Selects the final action.
  * Explains why alternative proposals were rejected.

### On-Chain Execution

Every accepted decision is executed through a smart contract on Base Sepolia.

Actions include:

* Invest in Technology
* Build Military
* Form Alliances
* Launch Espionage
* Collect Tribute

All state transitions occur on-chain.

### AI Debate Visualization

The dashboard exposes the complete reasoning process:

* Economist proposal
* Strategist proposal
* Governor verdict
* Rejected proposal explanation
* Transaction confirmation

Users can observe how autonomous governments arrive at decisions rather than only seeing outcomes.

### Persistent Nation Evolution

Each cycle updates:

* Treasury
* Technology
* Military Strength
* Diplomacy

Over time nations develop unique identities and strategies.

---

## Nation Archetypes

### Tech Nation

Prioritizes innovation and technological dominance.

Starting traits:

* High technology
* Moderate treasury
* Lower military focus

### Trade Nation

Optimizes for economic growth and resource accumulation.

Starting traits:

* Strong treasury
* High diplomacy
* Balanced development

### Military Nation

Focuses on security, power projection, and strategic control.

Starting traits:

* High military score
* Lower technology
* Aggressive strategic posture

---

## Governance Flow

1. World state is read from the blockchain.
2. Economist proposes an action.
3. Strategist proposes an action.
4. Governor evaluates both proposals.
5. Governor selects a winning proposal.
6. Transaction is submitted on-chain.
7. Nation state updates.
8. Cycle advances.

```text
Blockchain State
        ↓
Economist
        ↓
Strategist
        ↓
Governor
        ↓
On-Chain Transaction
        ↓
Updated World State
```

---

## Architecture

```text
Frontend (Next.js)
        ↓
Backend API (Express + TypeScript)
        ↓
AI Agent Layer
        ↓
Smart Contract (Base Sepolia)
        ↓
Blockchain State
```

### Frontend

* Next.js
* TypeScript
* Tailwind CSS
* Zustand

### Backend

* Node.js
* Express
* TypeScript
* Ethers.js

### Smart Contracts

* Solidity
* Hardhat

### AI Layer

* Multi-agent architecture
* Economist Agent
* Strategist Agent
* Governor Agent

---

## Repository Structure

```text
agent-nation/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── store/
│
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   ├── api/
│   │   ├── blockchain/
│   │   ├── orchestrator/
│   │   ├── prompts/
│   │   ├── schemas/
│   │   └── services/
│
└── agent-nation-contracts/
    ├── contracts/
    ├── scripts/
    └── test/
```

---

## Local Setup

### Clone the Repository

```bash
git clone <repository-url>
cd agent-nation
```

### Smart Contracts

```bash
cd agent-nation-contracts

npm install
```

Create a `.env` file using `.env.example`.

Deploy to Base Sepolia:

```bash
npm run deploy:sepolia
```

### Backend

```bash
cd backend

npm install
```

Create a `.env` file using `.env.example`.

Start the API server:

```bash
npm run serve
```

Run a single simulation cycle:

```bash
npm run cycle
```

### Frontend

```bash
cd frontend

npm install
npm run dev
```

---

## API Endpoints

### Health Check

```http
GET /api/health
```

### Current On-Chain Snapshot

```http
GET /api/snapshot
```

Returns the current blockchain world state.

### Latest Completed Cycle

```http
GET /api/latest
```

Returns the most recent completed simulation cycle.

### Simulation History

```http
GET /api/history?limit=20
```

Returns recent simulation history.

### Trigger a New Cycle

```http
POST /api/trigger
```

Requires:

```http
X-Api-Key
```

---

## Security Notes

* Private keys are never committed to version control.
* Environment variables are excluded from Git.
* Executor permissions are enforced on-chain.
* Deployments use Base Sepolia testnet.

---

## Why This Project?

Most AI systems stop at generating text.

Agent Nations explores a different question:

**What happens when AI agents can govern, debate, and act autonomously on-chain?**

Instead of chat responses, AI decisions become blockchain state.

Each cycle produces real decisions, real governance outcomes, and real on-chain transactions.

---

## Future Directions

* Persistent historical database
* Additional nation archetypes
* Treaty systems
* Resource economies
* Human governance participation
* Autonomous AI alliances
* Cross-chain simulations

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.
