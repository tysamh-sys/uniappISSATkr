# University Attendance & Absence Management System — Backend API

A robust, production-ready RESTful API backend for university attendance and absence management built with **Node.js**, **Express.js**, **TypeScript**, **PostgreSQL**, and **Prisma ORM**.

---

## 🚀 System Architecture & Features

- **Stateless RESTful API**: Built for Web Admin Dashboard (React) and Mobile Application (React Native).
- **Relational PostgreSQL & Prisma**: Full transactional constraints, normalized relations, explicit indexing.
- **Authentication & Authorization**:
  - JWT Bearer Token Authentication.
  - Role-Based Access Control (`ADMIN` vs `TEACHER`).
  - Session Ownership Verification (Teachers can only record attendance for their assigned classes).
- **Timetable Engine**:
  - Multi-semester timetable versioning (`TimetableVersion`).
  - Strict conflict detection engine for Teacher, Class, and Room time overlaps.
  - Multi-step Excel / CSV Import Pipeline (`Parse -> Validate -> Preview -> Confirm -> Insert`).
- **Attendance & Alert Engine**:
  - Distinguishes **Expected Sessions** from **Recorded Attendance Sessions**.
  - Missing Attendance Alerts (`ATTENDANCE_NOT_RECORDED` $\neq$ `TEACHER_ABSENT`).
  - Dynamic Today Schedule API for Teacher Smartphones.
- **Swagger / OpenAPI Documentation**: Interactive API documentation served at `/api/docs`.

---

## 🔑 Development Credentials & Seed Data

Default development credentials created by `npm run prisma:seed`:

| Role | Email | Password | Details |
|---|---|---|---|
| **ADMIN** | `admin@university.edu` | `AdminPass123!` | System Administrator |
| **TEACHER** | `ahmed.benali@university.edu` | `TeacherPass123!` | Teacher (Ahmed Benali) |
| **TEACHER** | `sami.mansouri@university.edu` | `TeacherPass123!` | Teacher (Sami Mansouri) |
| **TEACHER** | `fatima.hadj@university.edu` | `TeacherPass123!` | Teacher (Fatima Hadj) |

### Sample Data Included:
- **Classes**: `2CS`, `1CS`
- **Students**: 22 Active Students enrolled across `2CS` and `1CS`
- **Subjects**: Web Development (`WEB201`), Computer Networks (`NET201`), Database Systems (`DB201`), Software Engineering (`SE101`)
- **Rooms**: `B12`, `B14`, `Lab 3`
- **Absence Reasons**: Medical, Personal, Administrative, Unknown, Other

---

## 🛠️ Installation & Setup Guide

### 1. Requirements
- Node.js (v18+)
- PostgreSQL Database Server

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` matches your local PostgreSQL instance:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/university_attendance?schema=public"
JWT_SECRET="super-secret-university-jwt-key-2026-change-in-production"
PORT=5000
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Migration & Seeding
```bash
# Push schema to PostgreSQL database
npm run prisma:push

# Seed development database
npm run prisma:seed
```

### 5. Start Server
```bash
# Development mode (Hot-reload via tsx)
npm run dev

# Production build & start
npm run build
npm start
```

---

## 🐳 Running with Docker (Recommended)

Since Docker Desktop is installed, you can run the entire system (PostgreSQL Database + Backend API) in isolated containers with zero manual configuration.

### Option A: One-Click Windows Launchers
- **Start App**: Double-click [docker-start.bat](file:///c:/Users/otays/Desktop/uniapp/docker-start.bat) (starts DB + API and opens Swagger UI).
- **Stop App**: Double-click [docker-stop.bat](file:///c:/Users/otays/Desktop/uniapp/docker-stop.bat).
- **Seed Database**: Double-click [docker-seed.bat](file:///c:/Users/otays/Desktop/uniapp/docker-seed.bat).

### Option B: Terminal / CLI
```bash
# Build & start all services in background
npm run docker:up
# Or directly: docker compose up -d

# Seed the database inside the container
npm run docker:seed

# View live container logs
npm run docker:logs

# Stop containers
npm run docker:down
```

### Services & URLs:
- **Backend API**: `http://localhost:5000`
- **Swagger Documentation**: `http://localhost:5000/api/docs`
- **Health Check**: `http://localhost:5000/health`
- **PostgreSQL Database**: `localhost:5432` (`postgres` / `postgres`, DB: `university_attendance`)


---

## 📚 API Endpoints Summary

### Authentication
- `POST /api/auth/login`: Authenticate user & get JWT token.
- `POST /api/auth/logout`: Stateless client logout.
- `GET  /api/auth/me`: Get authenticated user profile.

### Administration (`Role: ADMIN`)
- `GET/POST /api/admin/students`: Manage students.
- `GET/POST /api/admin/teachers`: Manage teachers & account creation.
- `GET/POST /api/admin/classes`: Manage class groups.
- `GET/POST /api/admin/subjects`: Manage course subjects.
- `GET/POST /api/admin/rooms`: Manage classrooms.
- `GET/POST /api/admin/timetable/versions`: Manage timetable versions.
- `GET/POST /api/admin/timetable/entries`: Manage scheduled class slots.
- `POST /api/admin/timetable/import/preview`: Upload Excel/CSV file for conflict checking.
- `POST /api/admin/timetable/import/confirm`: Confirm batch timetable import.
- `GET  /api/admin/dashboard`: Dashboard statistics overview.
- `GET  /api/admin/attendance/missing`: View missing attendance alerts.

### Teacher (`Role: TEACHER`)
- `GET /api/teacher/schedule`: Get full weekly schedule.
- `GET /api/teacher/schedule/today`: Get today's classes with completion status.
- `GET /api/teacher/sessions/:sessionId`: Get student roster for session.
- `POST /api/teacher/sessions/:sessionId/attendance`: Submit student attendance records.

### Interactive Swagger Docs
Access live interactive documentation at:
👉 **`http://localhost:5000/api/docs`**

---

## 🧪 Testing

Run automated tests:
```bash
npm test
```
