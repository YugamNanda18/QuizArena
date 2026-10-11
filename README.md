# QuizArena Enterprise
### Production-Grade Real-Time Assessment, Examination & Live Leaderboard Platform

[![Tests](https://img.shields.io/badge/tests-15%20passed-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)]()
[![Node.js](https://img.shields.io/badge/Node.js-v22-green.svg)]()
[![React](https://img.shields.io/badge/React-18-cyan.svg)]()
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-black.svg)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-emerald.svg)]()

---

## 🌟 Executive Summary
QuizArena Enterprise is an end-to-end, real-time assessment platform engineered for enterprise certifications, competitive university assessments, and proctored technical evaluations. Built on a hardened TypeScript architecture with persistent MongoDB storage and Socket.IO real-time synchronization, it ensures integrity through server-authoritative timers, dynamic question point assignments, real-time room sharing with mobile QR codes, configurable compulsory/optional questions, and automated competition tie-breaking by speed.

---

## 🚀 Key Features

### 1. Student User Journey
- **Candidate Landing Portal**: Enter room codes or auto-join via live WebSocket broadcast.
- **Candidate Registration**: Register with Full Name, Email, and mandatory Student ID. Seamless session resumption on reload.
- **Synchronized Waiting Room**: Candidates wait together while live Socket.IO connection monitors proctor launch. Questions remain cryptographically protected before test start.
- **Live MCQ Interface**: Authoritative countdown clock, question navigator, dynamic question points (10 to 500 pts), and instant server answer confirmation.
- **Compulsory vs. Optional Enforcement**: Strict modal validation guarantees candidates cannot submit without completing admin-specified compulsory questions, while optional questions can be skipped.
- **Official Certified PDF**: Post-test performance certificate with breakdown, accuracy, response time, and security verification code.

### 2. Administrator & Proctor Console
- **Admin Dashboard**: Real-time metrics overview, assessment management, duplicate, archive, and delete operations.
- **Real-Time Room Sharing & QR Code**:
  - Live WebSocket broadcast notifies all candidate browser tabs in real-time with 1-click auto-join.
  - Generates instant QR code for mobile candidates to scan and join immediately.
  - 1-click sharing via direct link, WhatsApp, and Email.
- **Dynamic Points & Compulsory Question Editor**:
  - Assign individual point values to questions (e.g. 10, 25, 100, 500 pts).
  - Admin toggle: Enforce all questions compulsory globally, or configure per-question (`Compulsory` vs `Optional`).
- **Live Proctor Control Room**: Synchronized Launch, Pause, Resume, and Finalize Assessment.
- **Continuous Live Leaderboard**: Top 3 podium styling (Gold/Silver/Bronze), rank movement indicators (`▲`, `▼`, `—`), and instant recalculation upon every answer.
- **Enterprise Analytics & Exports**: Accuracy charts, score distribution histograms, and downloads for **Consolidated PDF**, **CSV**, and **Excel (.xlsx)**.

---

## ⚙️ Scoring & Tie-Breaking Engine Logic

1. **Total Points** (descending): The student with the higher score always ranks higher.
2. **Speed Tie-Breaker** (ascending cumulative response time): Ties in score are broken by cumulative response time across correct answers.
3. **Correct Count** (descending): When points and time are identical, candidate with more correct answers wins.
4. **Deterministic Tie-Breaker**: Server registration timestamp (`registeredAt` ascending).
5. **Standard Competition Ranking**: Applies `1, 2, 2, 4` ranking hierarchy.
6. **Strict Idempotency**: MongoDB compound unique index `{ quizId: 1, participantId: 1, questionId: 1 }` guarantees that network retries never award duplicate points.

---

## 📁 Repository Structure

```
QuizArena/
├── client/                     # React 18 + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/         # Navbar, LeaderboardTable, ShareRoomModal, Timer
│   │   ├── pages/              # LandingPage, WaitingRoom, ExamInterface, ResultsPage, Admin
│   │   ├── services/           # Typed REST API Client & Socket.IO Client
│   │   └── types/              # Domain Models & Interfaces
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/             # DB & Environment Configuration
│   │   ├── controllers/        # Auth, Quiz, Question, Registration, Answer, Export
│   │   ├── middleware/         # JWT Auth, Role Verification, Centralized Error Handler
│   │   ├── models/             # Mongoose Models (Quiz, Question, Participant, Answer, AuditLog)
│   │   ├── routes/             # Versioned REST API v1 Routes
│   │   ├── services/           # ScoringEngine, LeaderboardService, PDF ReportService
│   │   ├── socket/             # Socket.IO Event Handlers & Room Broadcasting
│   │   ├── tests/              # Vitest Unit & Integration Test Suite
│   │   ├── utils/              # Database Seeder (Admin Account Initialization)
│   │   └── server.ts           # HTTP & WebSocket Server Entrypoint
│   ├── package.json
│   └── tsconfig.json
├── docs/                       # Enterprise Architecture Documentation
├── docker-compose.yml          # Containerized Deployment Manifest
└── README.md
```

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js v18+ (tested on v20 and v22)
- MongoDB instance (Local or MongoDB Atlas cluster)

### 1. Server Configuration
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB Atlas URI, JWT Secret, and Admin credentials
npm run dev
```

### 2. Client Configuration
```bash
cd client
npm install
cp .env.example .env
# Edit .env (defaults to localhost:5000 in dev)
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🚀 Complete Production Deployment Guide

### Option A: Cloud Deployment (Vercel + Render / Railway)

#### 1. Database: MongoDB Atlas
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) so cloud servers can connect.
3. Under **Database Access**, create a database user (e.g., `quizadmin`).
4. Copy your connection string:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/quizarena_enterprise?retryWrites=true&w=majority`

#### 2. Backend: Deploy on Render / Railway
1. Push this repository to GitHub (`https://github.com/YugamNanda18/QuizArena.git`).
2. Log in to [Render](https://render.com) or [Railway](https://railway.app).
3. Create a **New Web Service** and connect your GitHub repository.
4. Configure service settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   - `PORT`: `5000` (or leave default for platform)
   - `NODE_ENV`: `production`
   - `MONGO_URI`: `mongodb+srv://...` (your Atlas URI)
   - `JWT_SECRET`: A secure random string (at least 32 characters)
   - `JWT_EXPIRES_IN`: `7d`
   - `CLIENT_URL`: Your frontend URL (e.g. `https://quizarena.vercel.app`)
   - `ADMIN_EMAIL`: `admin@yourdomain.com`
   - `ADMIN_PASSWORD`: Your chosen secure password
6. Deploy! Render will provide your public backend URL (e.g., `https://quizarena-api.onrender.com`).

#### 3. Frontend: Deploy on Vercel
1. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
2. Select your GitHub repository `YugamNanda18/QuizArena`.
3. Set **Root Directory** to `client`.
4. Framework Preset: **Vite**.
5. Add Environment Variables:
   - `VITE_API_URL`: Your backend URL (e.g., `https://quizarena-api.onrender.com`)
   - `VITE_SOCKET_URL`: Your backend URL (e.g., `https://quizarena-api.onrender.com`)
   - `VITE_DEFAULT_THEME`: `light`
6. Click **Deploy**. Vercel will build and deploy your app in under 1 minute!
7. Update `CLIENT_URL` in your backend environment variables to match your Vercel domain.

---

### Option B: Docker Deployment (Self-Hosted VPS / AWS EC2 / DigitalOcean)

Run the entire stack with a single command using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/YugamNanda18/QuizArena.git
cd QuizArena

# Configure production environment variables in server/.env
cp server/.env.example server/.env
cp client/.env.example client/.env

# Start with Docker Compose
docker-compose up -d --build
```

---

## 🧪 Automated Test Verification

Run the test suite verifying scoring mathematics, dynamic points, speed tie breaking, idempotency, and PDF generation:

```bash
cd server
npm test
```

### Verified Test Suite:
```
 ✓ src/tests/scoringEngine.test.ts (6 tests)
   - dynamic points configured on individual questions (10, 25, 100, 500 pts)
   - negative marking penalty application
   - zero points when negative marking disabled
   - speed tie-breaking (lower cumulative response time wins)
   - higher score always beats lower score regardless of speed
   - competition ranking hierarchy (1, 2, 2, 4)
 ✓ src/tests/integration.test.ts (9 tests)
   - admin creates quiz with dynamic points & negative marks
   - admin configures questions with custom point values
   - admin opens waiting room
   - 3 candidates register and join room
   - questions protected before proctor launch (HTTP 403)
   - admin starts quiz (status LIVE, synchronized deadline)
   - concurrent answers evaluated, speed tie-break verified, idempotency checked
   - live leaderboard ranking verified
   - student PDF certificate, consolidated PDF, CSV, and Excel exports generated

 Test Files  2 passed (2)
      Tests  15 passed (15)
```

---

## 📜 License
MIT © 2026 QuizArena Enterprise. Developed by Yugam Nanda.
