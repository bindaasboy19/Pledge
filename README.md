# National Cyber Security Awareness Month — Cyber Safety Pledge (MERN)

A production-ready full-stack **MERN (MongoDB, Express, React, Node.js)** application for the **National Cyber Security Awareness Month (NCSAM) Cyber Safety Pledge** campaign, organized by **The Cyber Shield Project (Naksh Foundation)**.

---

## Architecture Overview

```text
                  USER (Browser)
                        │
                        ▼
             ┌─────────────────────┐
             │   React Frontend    │ (Vite, TailwindCSS, Lucide)
             │   (Port 5173)       │
             └──────────┬──────────┘
                        │ /api/* (Proxied / Direct HTTPS)
                        ▼
             ┌─────────────────────┐
             │ Node + Express API  │ (Helmet, CORS, Rate Limit, Zod)
             │ (Port 5001)         │
             └──────────┬──────────┘
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
      ┌─────────────┐       ┌─────────────┐
      │   MongoDB   │       │   Email &   │
      │   (Mongoose)│       │ Certificate │
      └─────────────┘       │  (PDFKit +  │
                            │ Nodemailer) │
                            └─────────────┘
```

---

## Directory Structure

```text
NCSAM-Pledge/
├── Frontend/                 # React client application (Vite)
│   ├── src/
│   │   ├── api/              # Unified REST API client (Fetch wrapper)
│   │   ├── components/       # UI components (Hero, Pledge Reader, Form, Success)
│   │   ├── config/           # Campaign text, bilingual pledges (EN/HI), config
│   │   ├── hooks/            # usePledge state machine
│   │   ├── services/         # Pledge & Share service adapters
│   │   └── utils/            # Canvas share card generator
│   ├── .env.example
│   └── package.json
│
├── Backend/                  # Node.js + Express REST API
│   ├── src/
│   │   ├── config/           # Database (Mongoose) & Environment config
│   │   ├── controllers/      # Pledge endpoints logic
│   │   ├── middleware/       # Rate limiting, error handling, 404
│   │   ├── models/           # Pledge participant Mongoose schema
│   │   ├── routes/           # Health & Pledge API routes
│   │   ├── services/         # Pledge recording, PDFKit certificate, Nodemailer
│   │   ├── validators/       # Zod request schema validation & normalization
│   │   ├── app.js            # Express app configuration
│   │   └── server.js         # HTTP server entry point & graceful shutdown
│   ├── tests/                # Automated API integration tests (Node test runner)
│   ├── .env.example
│   └── package.json
│
├── package.json              # Root workspace management script
└── README.md
```

---

## Quick Start (Local Development)

### 1. Backend Setup

```bash
cd Backend
npm install
npm run dev     # Runs on port 5001 with embedded/local MongoDB
```

*Note: In development, if `MONGODB_URI` is omitted, the backend automatically spins up an in-memory MongoDB instance for zero-configuration local development.*

### 2. Frontend Setup

```bash
cd Frontend
npm install
npm run dev     # Runs on port 5173 with Vite proxy pointing to :5001
```

### 3. Root Workspace Commands

From the root directory:

```bash
npm run server  # Start backend in development mode
npm run client  # Start frontend in development mode
npm run build   # Build production frontend bundle
npm test        # Run backend integration tests
```

---

## Backend API Specification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check (returns database status) |
| `GET` | `/api/pledges/count` | Live total count of pledged participants |
| `POST` | `/api/pledges` | Submits pledge commitment & optional certificate dispatch |

---

## Certificate & Email Rules

1. **Certificate Consent (`receiveCertificate === true`)**:
   - Backend renders a high-resolution vector PDF certificate of commitment using PDFKit in memory.
   - Dispatches the certificate as a PDF attachment via Nodemailer to the participant's email.
   - Sets `certificateSentAt` in MongoDB.
   - Frontend success screen shows confirmation that the certificate was emailed.
   - **The certificate is strictly NEVER rendered on-screen or downloaded directly from the browser.**

2. **No Certificate Consent (`receiveCertificate === false`)**:
   - Saves participant commitment to MongoDB.
   - **Does NOT generate a certificate.**
   - **Does NOT send any email.**
   - Frontend displays success confirmation without certificate email notice.

3. **Idempotency & Duplicate Protection**:
   - If a participant submits the form multiple times, the server updates their record without re-sending redundant certificate emails if one was already dispatched.
# Pledge
