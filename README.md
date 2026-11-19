# 🎓 uniappISSATkr — Unified University Attendance & Timetable Management Ecosystem

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-Expo-black.svg)](https://expo.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748.svg)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Swagger](https://img.shields.io/badge/OpenAPI-Swagger-85EA2D.svg)](http://localhost:5000/api/docs)

**uniappISSATkr** is an end-to-end, multi-platform digital attendance, absence justification, and timetable management solution custom-engineered for **ISSAT Kairouan** (*Institut Supérieur des Sciences Appliquées et de Technologie de Kairouan*). 

The platform unites university administration, faculty teachers, and students across three interconnected applications:
1. 🚀 **Backend RESTful API & Timetable Engine** (Node.js, Express, TypeScript, Prisma, PostgreSQL).
2. 💻 **Web Administration & Management Portal** (React 19, Vite, TypeScript).
3. 📱 **Mobile Campus Application** (React Native, Expo, TypeScript for iOS & Android).

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Clients ["Client Applications"]
        WEB["💻 Web Portal (React 19 + Vite)<br/>Admin • Teacher • Student"]
        MOB["📱 Mobile App (React Native + Expo)<br/>iOS & Android (Expo Go)"]
    end

    subgraph Gateway ["Security & API Layer"]
        API["⚡ Express.js API (:5000)<br/>JWT Auth • RBAC • Input Validation"]
        DOCS["📖 Swagger UI (/api/docs)"]
    end

    subgraph CoreEngine ["Core Business Engines"]
        ATT["📋 Attendance & Roll-Call Engine"]
        ALERT["⚠️ Missing Attendance & Alert Engine"]
        TIME["📅 Timetable & Conflict Resolution Engine"]
        JUST["📄 Medical Certificate & Justification Engine"]
    end

    subgraph DataLayer ["Data & Storage"]
        PRISMA["⚡ Prisma ORM"]
        DB[("🐘 PostgreSQL 16")]
    end

    WEB -->|HTTP/REST| API
    MOB -->|HTTP/REST| API
    API --> DOCS
    API --> ATT
    API --> ALERT
    API --> TIME
    API --> JUST
    ATT --> PRISMA
    ALERT --> PRISMA
    TIME --> PRISMA
    JUST --> PRISMA
    PRISMA --> DB
```

---

## ✨ Key Features & Ecosystem Breakdown

### 1. ⚡ Backend RESTful API & Business Logic (`src/`)
- **Stateless JWT Authentication**: Secure role-based token auth with hashed passwords (`bcryptjs`).
- **Role-Based Access Control (RBAC)**: Fine-grained permissions across `ADMIN`, `TEACHER`, and `STUDENT`.
- **Intelligent Timetable Engine**:
  - Semester versioning (`TimetableVersion`).
  - Real-time conflict detection preventing teacher, room, or class double-bookings.
  - Multi-stage Excel / CSV Timetable Import Pipeline (`Upload -> Validate -> Preview Conflicts -> Confirm`).
- **Missing Attendance Alert Engine**:
  - Distinguishes *Expected Timetable Sessions* from *Recorded Attendance Sessions*.
  - Detects unrecorded sessions (`ATTENDANCE_NOT_RECORDED`) to prevent reporting gaps.
- **Interactive OpenAPI/Swagger**: Interactive live API playground served at `/api/docs`.

### 2. 💻 Web Administration Portal (`frontend/`)
- **Administration Dashboard**:
  - Real-time KPIs: Student counts, faculty members, pending medical certificates, monthly absence trends.
  - Complete Student CRUD with search, grade/filière filters, and automated account generation.
  - Teacher Management: Subject assignments, account activation/suspension, secure credential resets.
  - Certificate Review Queue: Document verification, accept/reject workflows with mandatory justification reason.
- **Teacher Workspace**:
  - Interactive digital roll-call: Mark students as `Present` or `Absent`.
  - Safety locks on student records that are already justified or pending review.
- **Student Portal**:
  - Personal absence summaries with automatic 3-absence disciplinary warnings.
  - Online medical certificate & justification submission (supports PDF, JPG, PNG up to 5MB).

### 3. 📱 Mobile Smartphone App (`mobile/`)
- **Built for Teachers & Students**:
  - **Dynamic Next-Class Countdown**: Real-time card showing "Class starts in 12 min" with room and subject info.
  - **Mobile Roll-Call**: One-touch attendance buttons (`P` / `A`) with real-time tally counter.
  - **Document Scanner**: Built-in camera scanner with framing guides to photograph and upload doctor certificates.
  - **Interactive Timetable**: Day-by-day swipeable schedule selector (Mon–Sat).
  - **Offline Resilience & Sync**: Local state fallback when network drops on campus.
  - **Customizable Experience**: Dark/Light mode, English & French language support.

---

## 📂 Repository Structure

```
uniappISSATkr/
├── src/                         # Express.js REST API source
│   ├── config/                  # Database, Prisma client, environment configurations
│   ├── controllers/             # Request handlers (Admin, Teacher, Student, Auth, Sessions)
│   ├── docs/                    # OpenAPI / Swagger specifications
│   ├── middlewares/             # JWT auth, RBAC guard, input validation, error handling
│   ├── routes/                  # Express route definitions
│   ├── services/                # Business logic (Timetable, Absences, Certificates, etc.)
│   ├── utils/                   # Password hashing, JWT signing, date utilities
│   └── validators/              # Joi / Zod request payload schemas
├── prisma/                      # Database Schema & Seed Data
│   ├── schema.prisma            # PostgreSQL data model
│   └── seed.ts                  # Comprehensive demo seed script
├── tests/                       # Automated Jest test suites (Auth, API Audit, Timetable)
├── frontend/                    # Web Management Portal (React 19 + Vite)
│   ├── src/                     # React components, pages, hooks, state, router
│   ├── Dockerfile               # Production container for web portal
│   └── vite.config.ts           # Vite configuration
├── mobile/                      # Mobile Application (React Native + Expo)
│   ├── assets/                  # ISSAT logo, icons, splash screens
│   ├── App.tsx                  # Main Expo application entry
│   ├── app.json                 # Expo app manifest
│   └── eas.json                 # Expo Application Services build configuration
├── docker-compose.yml           # Multi-container orchestration (API + PostgreSQL)
├── Dockerfile                   # Node.js API Alpine image definition
├── docker-start.bat             # 1-Click Windows launcher (DB + API + Swagger)
├── docker-seed.bat              # 1-Click database seed runner
├── docker-stop.bat              # 1-Click graceful shutdown script
├── package.json                 # Root backend dependencies & scripts
└── tsconfig.json                # TypeScript compiler configuration
```

---

## 🔑 Default Credentials & Demo Accounts

When database seeding is performed (`npm run prisma:seed` or `docker-seed.bat`), the following accounts are provisioned:

| Role | Email | Password | Full Name / Description |
|---|---|---|---|
| **ADMIN** | `admin@university.edu` | `AdminPass123!` | System Administrator |
| **TEACHER** | `ahmed.benali@university.edu` | `TeacherPass123!` | Dr. Ahmed Benali (Computer Science) |
| **TEACHER** | `sami.mansouri@university.edu` | `TeacherPass123!` | Prof. Sami Mansouri (Networks) |
| **TEACHER** | `fatima.hadj@university.edu` | `TeacherPass123!` | Dr. Fatima Hadj (Databases) |
| **STUDENT** | `lina.benali@etu.univ.tn` | `Etud123!` | Lina Benali (`2CS` Student) |

> 💡 *All additional seeded students use password `Etud123!` and format `firstname.lastname@etu.univ.tn`.*

---

## 🚀 Quick Start Guide

### Option 1: 🐳 Running with Docker (Recommended)

Run the PostgreSQL database and Backend API in isolated containers with zero manual configuration.

#### Using Windows 1-Click Launchers:
1. **Start System**: Double-click `docker-start.bat` (Starts PostgreSQL + API and opens Swagger UI).
2. **Seed Data**: Double-click `docker-seed.bat` (Seeds demo classes, teachers, students, and timetable).
3. **Stop System**: Double-click `docker-stop.bat`.

#### Using Terminal / CLI:
```bash
# 1. Start database and backend containers
docker compose up -d

# 2. Seed development data
npm run docker:seed

# 3. View live logs
npm run docker:logs

# 4. Stop containers
docker compose down
```

**Running Service URLs:**
- ⚡ **Backend API**: [http://localhost:5000](http://localhost:5000)
- 📖 **Swagger Documentation**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- 🩺 **Health Check**: [http://localhost:5000/health](http://localhost:5000/health)
- 🐘 **PostgreSQL Port**: `localhost:5432` (`postgres` / `postgres`, DB: `university_attendance`)

---

### Option 2: 💻 Running Backend Locally (Node.js + PostgreSQL)

#### 1. Prerequisites
- **Node.js**: v18.x or v20.x+
- **PostgreSQL**: Server running locally on port `5432`

#### 2. Configure Environment
Create a `.env` file in the project root:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/university_attendance?schema=public"
JWT_SECRET="super-secret-university-jwt-key-2026-change-in-production"
PORT=5000
```

#### 3. Install, Migrate & Start
```bash
# Install root dependencies
npm install

# Push schema to PostgreSQL
npm run prisma:push

# Populate sample data
npm run prisma:seed

# Start backend development server with hot-reload
npm run dev
```

---

### Option 3: 🌐 Running Web Administration Portal (`frontend/`)

```bash
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) (or `http://localhost:8443` depending on port availability).

---

### Option 4: 📱 Running Mobile App on Phone (`mobile/`)

1. **Install Expo Go** on your iOS or Android smartphone from the App Store / Google Play.
2. In your terminal, navigate to the mobile folder:
   ```bash
   cd mobile
   npm install
   npm start
   ```
3. **Connect to your phone**:
   - **Android**: Open **Expo Go** and scan the QR code printed in your terminal.
   - **iOS**: Open the native **Camera** app, point at the terminal QR code, and tap the prompt to open in Expo Go.
   - *If your phone and PC are on separate Wi-Fi networks, run:* `npx expo start --tunnel`.

---

## 📚 API Endpoints Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticate user & issue JWT bearer token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile |
| `GET` | `/api/admin/dashboard` | `ADMIN` | Fetch university-wide attendance analytics & KPIs |
| `GET/POST` | `/api/admin/students` | `ADMIN` | List and register students |
| `GET/POST` | `/api/admin/teachers` | `ADMIN` | List and create faculty member profiles |
| `GET/POST` | `/api/admin/classes` | `ADMIN` | Manage academic classes and grade groups |
| `GET/POST` | `/api/admin/subjects` | `ADMIN` | Manage curriculum subjects and module codes |
| `GET/POST` | `/api/admin/rooms` | `ADMIN` | Manage university classrooms and labs |
| `POST` | `/api/admin/timetable/import/preview` | `ADMIN` | Upload CSV/Excel schedule for conflict pre-check |
| `POST` | `/api/admin/timetable/import/confirm` | `ADMIN` | Commit conflict-free timetable import |
| `GET` | `/api/admin/attendance/missing` | `ADMIN` | List unrecorded expected attendance alerts |
| `GET` | `/api/teacher/schedule/today` | `TEACHER` | Get teacher's daily class schedule & roll-call status |
| `GET` | `/api/teacher/sessions/:sessionId` | `TEACHER` | Retrieve student roster for scheduled session |
| `POST` | `/api/teacher/sessions/:sessionId/attendance` | `TEACHER` | Submit student presence/absence records |
| `GET` | `/api/absences/my` | `STUDENT` | View student personal absence records and thresholds |
| `POST` | `/api/certificates/upload` | `STUDENT` | Submit medical certificate justification document |
| `PUT` | `/api/certificates/:id/review` | `ADMIN` | Approve or reject submitted justification |

Interactive Swagger documentation with complete schemas and try-it-out capabilities is available at [http://localhost:5000/api/docs](http://localhost:5000/api/docs).

---

## 🧪 Testing & Code Quality

Run backend unit and integration test suites:
```bash
# Run all automated tests
npm test

# Run frontend typecheck
cd frontend && npm run typecheck
```

---

## 🛡️ Security Best Practices
- **Environment Isolation**: `.env` files and database credentials are excluded from version control via `.gitignore`.
- **Password Security**: Passwords are encrypted using salted `bcryptjs` hashing.
- **Strict Authorization**: Middleware verifies both role authorization and session ownership (teachers can only access and submit attendance for their assigned classes).

---

## 📄 License
This project is developed for **ISSAT Kairouan** educational and administrative operations. All rights reserved.
