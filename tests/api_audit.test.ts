import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { DayOfWeek, TimetableVersionStatus, AttendanceStatus } from '@prisma/client';

describe('University Attendance System - Comprehensive Backend Audit Test Suite', () => {
  let adminToken: string;
  let teacherToken: string;
  let teacher2Token: string;
  let teacherId: string;
  let teacher2Id: string;
  let activeVersionId: string;
  let class2CSId: string;
  let subjectWebId: string;
  let roomB12Id: string;
  let entryMondayTeacher1Id: string;
  let seededSessionId: string;

  beforeAll(async () => {
    // 1. Fetch seed entities
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@university.edu' } });
    const teacherUser1 = await prisma.user.findUnique({
      where: { email: 'ahmed.benali@university.edu' },
      include: { teacher: true },
    });
    const teacherUser2 = await prisma.user.findUnique({
      where: { email: 'sami.mansouri@university.edu' },
      include: { teacher: true },
    });

    if (!adminUser || !teacherUser1 || !teacherUser2) {
      throw new Error('Database is not seeded properly before running tests');
    }

    teacherId = teacherUser1.teacher!.id;
    teacher2Id = teacherUser2.teacher!.id;

    // Login Admin
    const adminLoginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@university.edu',
      password: 'AdminPass123!',
    });
    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.data.token;

    // Login Teacher 1 (Ahmed Benali)
    const teacherLoginRes = await request(app).post('/api/auth/login').send({
      email: 'ahmed.benali@university.edu',
      password: 'TeacherPass123!',
    });
    expect(teacherLoginRes.status).toBe(200);
    teacherToken = teacherLoginRes.body.data.token;

    // Login Teacher 2 (Sami Mansouri)
    const teacher2LoginRes = await request(app).post('/api/auth/login').send({
      email: 'sami.mansouri@university.edu',
      password: 'TeacherPass123!',
    });
    expect(teacher2LoginRes.status).toBe(200);
    teacher2Token = teacher2LoginRes.body.data.token;

    // Query active timetable version and sample references
    const activeVersion = await prisma.timetableVersion.findFirst({
      where: { status: TimetableVersionStatus.ACTIVE },
    });
    activeVersionId = activeVersion!.id;

    const classItem = await prisma.class.findFirst({ where: { name: '2CS' } });
    class2CSId = classItem!.id;

    const subjectItem = await prisma.subject.findFirst({ where: { code: 'WEB201' } });
    subjectWebId = subjectItem!.id;

    const roomItem = await prisma.room.findFirst({ where: { name: 'B12' } });
    roomB12Id = roomItem!.id;

    const entry1 = await prisma.timetableEntry.findFirst({
      where: { teacherId, timetableVersionId: activeVersionId, dayOfWeek: DayOfWeek.MONDAY },
    });
    entryMondayTeacher1Id = entry1!.id;

    const seededSession = await prisma.attendanceSession.findFirst({
      where: { teacherId: teacher2Id },
    });
    if (seededSession) {
      seededSessionId = seededSession.id;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ==========================================
  // SECTION 1: Health & Documentation
  // ==========================================
  describe('1. Health & Documentation APIs', () => {
    it('GET /health - should return status UP', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /api/docs/ - should serve Swagger UI', async () => {
      const res = await request(app).get('/api/docs/');
      expect([200, 301, 302]).toContain(res.status);
    });
  });

  // ==========================================
  // SECTION 2: Authentication & Authorization Flow
  // ==========================================
  describe('2. Authentication Flow (/api/auth)', () => {
    it('POST /api/auth/login - valid admin login', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@university.edu',
        password: 'AdminPass123!',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('ADMIN');
    });

    it('POST /api/auth/login - valid teacher login', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'ahmed.benali@university.edu',
        password: 'TeacherPass123!',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('TEACHER');
      expect(res.body.data.user.teacher.id).toBeDefined();
    });

    it('POST /api/auth/login - reject invalid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@university.edu',
        password: 'WrongPassword!',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/login - reject bad email format', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'not-an-email',
        password: 'Password123!',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/logout - client stateless logout', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/auth/me - authenticated admin profile', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('admin@university.edu');
      expect(res.body.data.role).toBe('ADMIN');
    });

    it('GET /api/auth/me - authenticated teacher profile', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('ahmed.benali@university.edu');
      expect(res.body.data.role).toBe('TEACHER');
      expect(res.body.data.teacher).toBeDefined();
    });

    it('GET /api/auth/me - reject unauthenticated request', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/auth/me - reject malformed bearer token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid.token.payload');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // SECTION 3: Role-Based Access Control (RBAC)
  // ==========================================
  describe('3. Role-Based Access Control (RBAC)', () => {
    it('Teacher cannot access Admin dashboard (403 Forbidden)', async () => {
      const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Admin cannot access Teacher schedule (403 Forbidden)', async () => {
      const res = await request(app).get('/api/teacher/schedule').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Unauthenticated user cannot access Admin endpoints (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/admin/students');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Unauthenticated user cannot access Teacher endpoints (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/teacher/schedule');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // SECTION 4: Admin Dashboard & Monitoring
  // ==========================================
  describe('4. Admin Dashboard & Monitoring APIs', () => {
    it('GET /api/admin/dashboard - retrieve system stats', async () => {
      const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalStudents).toBeGreaterThan(0);
      expect(res.body.data.totalTeachers).toBeGreaterThan(0);
      expect(res.body.data.todaySessions).toBeDefined();
      expect(res.body.data.recordedSessions).toBeDefined();
      expect(res.body.data.notRecordedSessions).toBeDefined();
    });

    it('GET /api/admin/attendance/missing - retrieve missing attendance alerts', async () => {
      const res = await request(app)
        .get('/api/admin/attendance/missing')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/admin/attendance/missing?date=2026-10-12 - retrieve for specific date', async () => {
      const res = await request(app)
        .get('/api/admin/attendance/missing?date=2026-10-12')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0].date).toBe('2026-10-12');
      }
    });

    it('GET /api/admin/attendance/records - retrieve attendance history', async () => {
      const res = await request(app)
        .get('/api/admin/attendance/records')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/admin/attendance/records - filter by classId', async () => {
      const res = await request(app)
        .get(`/api/admin/attendance/records?classId=${class2CSId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ==========================================
  // SECTION 5: Student Management CRUD
  // ==========================================
  describe('5. Students API (/api/admin/students)', () => {
    let testStudentId: string;

    it('GET /api/admin/students - list all students', async () => {
      const res = await request(app).get('/api/admin/students').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/admin/students?search=Benali - filter by search', async () => {
      const res = await request(app)
        .get('/api/admin/students?search=Benali')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/admin/students - reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Test' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/admin/students - create new student', async () => {
      const res = await request(app)
        .post('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentNumber: 'STU-AUDIT-999',
          firstName: 'Audit',
          lastName: 'Student',
          email: 'audit.student@university.edu',
          classId: class2CSId,
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.studentNumber).toBe('STU-AUDIT-999');
      testStudentId = res.body.data.id;
    });

    it('GET /api/admin/students/:id - get student by ID', async () => {
      const res = await request(app)
        .get(`/api/admin/students/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testStudentId);
    });

    it('GET /api/admin/students/:id - 404 for nonexistent student', async () => {
      const res = await request(app)
        .get('/api/admin/students/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('PUT /api/admin/students/:id - update student', async () => {
      const res = await request(app)
        .put(`/api/admin/students/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'UpdatedAudit' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('UpdatedAudit');
    });

    it('DELETE /api/admin/students/:id - delete student', async () => {
      const res = await request(app)
        .delete(`/api/admin/students/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // SECTION 6: Teacher Management CRUD
  // ==========================================
  describe('6. Teachers API (/api/admin/teachers)', () => {
    let testTeacherId: string;

    it('GET /api/admin/teachers - list all teachers', async () => {
      const res = await request(app).get('/api/admin/teachers').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/admin/teachers - reject invalid email and short password', async () => {
      const res = await request(app)
        .post('/api/admin/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teacherNumber: 'TCH-9999',
          firstName: 'Audit',
          lastName: 'Teacher',
          email: 'not-an-email',
          password: '123',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/admin/teachers - create new teacher and linked User', async () => {
      const res = await request(app)
        .post('/api/admin/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teacherNumber: 'TCH-AUDIT-999',
          firstName: 'Audit',
          lastName: 'Teacher',
          email: 'audit.teacher@university.edu',
          password: 'Password123!',
          phone: '+213 555 999 888',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('audit.teacher@university.edu');
      testTeacherId = res.body.data.id;
    });

    it('GET /api/admin/teachers/:id - get teacher by ID', async () => {
      const res = await request(app)
        .get(`/api/admin/teachers/${testTeacherId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testTeacherId);
    });

    it('GET /api/admin/teachers/:id - 404 for nonexistent teacher', async () => {
      const res = await request(app)
        .get('/api/admin/teachers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('PUT /api/admin/teachers/:id - update teacher details', async () => {
      const res = await request(app)
        .put(`/api/admin/teachers/${testTeacherId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '+213 555 000 111' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe('+213 555 000 111');
    });

    it('DELETE /api/admin/teachers/:id - delete teacher and cascade user', async () => {
      const res = await request(app)
        .delete(`/api/admin/teachers/${testTeacherId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // SECTION 7: Class Management CRUD
  // ==========================================
  describe('7. Classes API (/api/admin/classes)', () => {
    let testClassId: string;

    it('GET /api/admin/classes - list all classes', async () => {
      const res = await request(app).get('/api/admin/classes').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/admin/classes - reject missing fields with validation error', async () => {
      const res = await request(app)
        .post('/api/admin/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/admin/classes - create new class', async () => {
      const res = await request(app)
        .post('/api/admin/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '3CS-AUDIT', code: '3CS-AUD' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('3CS-AUDIT');
      testClassId = res.body.data.id;
    });

    it('POST /api/admin/classes - duplicate name fails with 400', async () => {
      const res = await request(app)
        .post('/api/admin/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '3CS-AUDIT', code: '3CS-DUP' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/admin/classes/:id - get class by ID', async () => {
      const res = await request(app)
        .get(`/api/admin/classes/${testClassId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('3CS-AUDIT');
    });

    it('GET /api/admin/classes/:id - 404 for nonexistent class', async () => {
      const res = await request(app)
        .get('/api/admin/classes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('PUT /api/admin/classes/:id - update class', async () => {
      const res = await request(app)
        .put(`/api/admin/classes/${testClassId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: '3CS-UPD' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('3CS-UPD');
    });

    it('DELETE /api/admin/classes/:id - delete class', async () => {
      const res = await request(app)
        .delete(`/api/admin/classes/${testClassId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // SECTION 8: Subject Management CRUD
  // ==========================================
  describe('8. Subjects API (/api/admin/subjects)', () => {
    let testSubjectId: string;

    it('GET /api/admin/subjects - list all subjects', async () => {
      const res = await request(app).get('/api/admin/subjects').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/admin/subjects - reject empty body', async () => {
      const res = await request(app)
        .post('/api/admin/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/admin/subjects - create new subject', async () => {
      const res = await request(app)
        .post('/api/admin/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Audit Security', code: 'SEC999' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('SEC999');
      testSubjectId = res.body.data.id;
    });

    it('GET /api/admin/subjects/:id - get subject by ID', async () => {
      const res = await request(app)
        .get(`/api/admin/subjects/${testSubjectId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Audit Security');
    });

    it('PUT /api/admin/subjects/:id - update subject', async () => {
      const res = await request(app)
        .put(`/api/admin/subjects/${testSubjectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Cybersecurity' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Cybersecurity');
    });

    it('DELETE /api/admin/subjects/:id - delete subject', async () => {
      const res = await request(app)
        .delete(`/api/admin/subjects/${testSubjectId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // SECTION 9: Room Management CRUD
  // ==========================================
  describe('9. Rooms API (/api/admin/rooms)', () => {
    let testRoomId: string;

    it('GET /api/admin/rooms - list all rooms', async () => {
      const res = await request(app).get('/api/admin/rooms').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/admin/rooms - create new room', async () => {
      const res = await request(app)
        .post('/api/admin/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Auditorium Z', building: 'Building C', capacity: 150 });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Auditorium Z');
      testRoomId = res.body.data.id;
    });

    it('GET /api/admin/rooms/:id - get room by ID', async () => {
      const res = await request(app)
        .get(`/api/admin/rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Auditorium Z');
    });

    it('PUT /api/admin/rooms/:id - update room capacity', async () => {
      const res = await request(app)
        .put(`/api/admin/rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ capacity: 200 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.capacity).toBe(200);
    });

    it('DELETE /api/admin/rooms/:id - delete room', async () => {
      const res = await request(app)
        .delete(`/api/admin/rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // SECTION 10: Absence Reasons Management CRUD
  // ==========================================
  describe('10. Absence Reasons APIs (/api/absence-reasons & /api/admin/absence-reasons)', () => {
    let testReasonId: string;

    it('GET /api/absence-reasons - accessible by authenticated teacher', async () => {
      const res = await request(app).get('/api/absence-reasons').set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/admin/absence-reasons - accessible by admin', async () => {
      const res = await request(app)
        .get('/api/admin/absence-reasons')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/admin/absence-reasons - create new reason', async () => {
      const res = await request(app)
        .post('/api/admin/absence-reasons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Audit Excuse', description: 'Testing excuse', requiresProof: true });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Audit Excuse');
      testReasonId = res.body.data.id;
    });

    it('GET /api/absence-reasons/:id - get absence reason by ID', async () => {
      const res = await request(app)
        .get(`/api/absence-reasons/${testReasonId}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Audit Excuse');
    });

    it('GET /api/admin/absence-reasons/:id - get absence reason by ID via admin', async () => {
      const res = await request(app)
        .get(`/api/admin/absence-reasons/${testReasonId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Audit Excuse');
    });

    it('PUT /api/admin/absence-reasons/:id - update reason', async () => {
      const res = await request(app)
        .put(`/api/admin/absence-reasons/${testReasonId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated testing excuse' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe('Updated testing excuse');
    });

    it('DELETE /api/admin/absence-reasons/:id - delete reason', async () => {
      const res = await request(app)
        .delete(`/api/admin/absence-reasons/${testReasonId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // SECTION 11: Timetable Versions, Entries & Conflict Detection
  // ==========================================
  describe('11. Timetable Versions & Conflict Engine', () => {
    let testVersionId: string;
    let testEntryId: string;

    it('GET /api/admin/timetable/versions - list timetable versions', async () => {
      const res = await request(app)
        .get('/api/admin/timetable/versions')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/admin/timetable/versions - reject validFrom >= validUntil', async () => {
      const res = await request(app)
        .post('/api/admin/timetable/versions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Semester',
          validFrom: '2027-06-01',
          validUntil: '2027-01-01',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/admin/timetable/versions - create draft version', async () => {
      const res = await request(app)
        .post('/api/admin/timetable/versions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Semester 2 2026/2027',
          validFrom: '2027-01-15',
          validUntil: '2027-06-15',
          status: 'DRAFT',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      testVersionId = res.body.data.id;
    });

    it('POST /api/admin/timetable/versions/:id/activate - activate version', async () => {
      const res = await request(app)
        .post(`/api/admin/timetable/versions/${testVersionId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');

      // Re-activate our primary active version for the remainder of tests
      await request(app)
        .post(`/api/admin/timetable/versions/${activeVersionId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    it('GET /api/admin/timetable/entries - list scheduled entries', async () => {
      const res = await request(app)
        .get(`/api/admin/timetable/entries?timetableVersionId=${activeVersionId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/admin/timetable/entries - create non-conflicting entry', async () => {
      const res = await request(app)
        .post('/api/admin/timetable/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          timetableVersionId: activeVersionId,
          dayOfWeek: 'THURSDAY',
          startTime: '14:00',
          endTime: '16:00',
          teacherId,
          classId: class2CSId,
          subjectId: subjectWebId,
          roomId: roomB12Id,
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      testEntryId = res.body.data.id;
    });

    it('POST /api/admin/timetable/entries - reject overlapping time with Teacher Conflict', async () => {
      // Teacher Ahmed is already scheduled on Monday 08:00-10:00
      const res = await request(app)
        .post('/api/admin/timetable/entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          timetableVersionId: activeVersionId,
          dayOfWeek: 'MONDAY',
          startTime: '09:00',
          endTime: '11:00',
          teacherId,
          classId: class2CSId,
          subjectId: subjectWebId,
          roomId: roomB12Id,
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Conflict/i);
    });

    it('PUT /api/admin/timetable/entries/:id - update entry time', async () => {
      const res = await request(app)
        .put(`/api/admin/timetable/entries/${testEntryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ startTime: '14:30', endTime: '16:30' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.startTime).toBe('14:30');
    });

    it('DELETE /api/admin/timetable/entries/:id - delete entry', async () => {
      const res = await request(app)
        .delete(`/api/admin/timetable/entries/${testEntryId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // SECTION 12: Timetable CSV/Excel Importer Pipeline
  // ==========================================
  describe('12. Timetable Import Pipeline', () => {
    it('POST /api/admin/timetable/import/preview - reject request without file', async () => {
      const res = await request(app)
        .post('/api/admin/timetable/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('timetableVersionId', activeVersionId);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/admin/timetable/import/preview - parse and preview valid CSV content', async () => {
      const csvData =
        'Day,Start,End,Teacher,Class,Subject,Room\n' +
        'WEDNESDAY,08:00,10:00,Ahmed Benali,2CS,WEB201,B12\n' +
        'WEDNESDAY,10:00,12:00,Sami Mansouri,2CS,NET201,B12\n';

      const res = await request(app)
        .post('/api/admin/timetable/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('timetableVersionId', activeVersionId)
        .attach('file', Buffer.from(csvData), 'timetable_test.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRows).toBe(2);
      expect(res.body.data.validCount).toBe(2);
      expect(res.body.data.errorCount).toBe(0);
      expect(res.body.data.preview[0].status).toBe('VALID');
    });

    it('POST /api/admin/timetable/import/preview - detect intra-file overlap conflict', async () => {
      const overlappingCsv =
        'Day,Start,End,Teacher,Class,Subject,Room\n' +
        'FRIDAY,08:00,10:00,Ahmed Benali,2CS,WEB201,B12\n' +
        'FRIDAY,09:00,11:00,Ahmed Benali,1CS,NET201,B14\n'; // Same teacher, overlapping time!

      const res = await request(app)
        .post('/api/admin/timetable/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('timetableVersionId', activeVersionId)
        .attach('file', Buffer.from(overlappingCsv), 'timetable_conflict.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.validCount).toBe(1);
      expect(res.body.data.errorCount).toBe(1);
      expect(res.body.data.preview[1].status).toBe('ERROR');
      expect(res.body.data.preview[1].errors[0]).toMatch(/Overlap/i);
    });

    it('POST /api/admin/timetable/import/confirm - batch import entries', async () => {
      const entriesToImport = [
        {
          dayOfWeek: 'SATURDAY',
          startTime: '08:00',
          endTime: '10:00',
          teacherId,
          classId: class2CSId,
          subjectId: subjectWebId,
          roomId: roomB12Id,
        },
      ];

      const res = await request(app)
        .post('/api/admin/timetable/import/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          timetableVersionId: activeVersionId,
          entries: entriesToImport,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);

      // Clean up the imported test entry
      const createdId = res.body.data.entries[0].id;
      await prisma.timetableEntry.delete({ where: { id: createdId } });
    });
  });

  // ==========================================
  // SECTION 13: Teacher Mobile API & Attendance Workflow
  // ==========================================
  describe('13. Teacher Mobile API & Attendance Workflow (/api/teacher)', () => {
    let initializedSessionId: string;

    it('GET /api/teacher/schedule - get weekly schedule for teacher', async () => {
      const res = await request(app).get('/api/teacher/schedule').set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("GET /api/teacher/schedule/today - get teacher's schedule for today with status", async () => {
      const res = await request(app)
        .get('/api/teacher/schedule/today')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.date).toBeDefined();
      expect(res.body.data.dayOfWeek).toBeDefined();
      expect(Array.isArray(res.body.data.classes)).toBe(true);
    });

    it('GET /api/teacher/schedule/today?date=2026-10-12 - query with specific date', async () => {
      const res = await request(app)
        .get('/api/teacher/schedule/today?date=2026-10-12')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.date).toBe('2026-10-12');
      expect(res.body.data.dayOfWeek).toBe('MONDAY');
    });

    it('POST /api/teacher/sessions/initialize - initialize session for scheduled entry', async () => {
      const res = await request(app)
        .post('/api/teacher/sessions/initialize')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          timetableEntryId: entryMondayTeacher1Id,
          date: '2026-10-12',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      initializedSessionId = res.body.data.id;
    });

    it('POST /api/teacher/sessions/initialize - idempotent call returns existing session', async () => {
      const res = await request(app)
        .post('/api/teacher/sessions/initialize')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          timetableEntryId: entryMondayTeacher1Id,
          date: '2026-10-12',
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body.data.id).toBe(initializedSessionId);
    });

    it('POST /api/teacher/sessions/initialize - forbidden if another teacher tries to initialize', async () => {
      // Teacher 2 tries to initialize Teacher 1's entry
      const res = await request(app)
        .post('/api/teacher/sessions/initialize')
        .set('Authorization', `Bearer ${teacher2Token}`)
        .send({
          timetableEntryId: entryMondayTeacher1Id,
          date: '2026-10-12',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('GET /api/teacher/sessions/:sessionId - get student roster for session', async () => {
      const res = await request(app)
        .get(`/api/teacher/sessions/${initializedSessionId}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session).toBeDefined();
      expect(res.body.data.students.length).toBeGreaterThan(0);
      expect(res.body.data.students[0].studentId).toBeDefined();
    });

    it('GET /api/teacher/sessions/:sessionId - session ownership check prevents other teachers', async () => {
      // Teacher 2 tries to view Teacher 1's session roster
      const res = await request(app)
        .get(`/api/teacher/sessions/${initializedSessionId}`)
        .set('Authorization', `Bearer ${teacher2Token}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('POST /api/teacher/sessions/:sessionId/attendance - submit student attendance', async () => {
      // Fetch roster first
      const rosterRes = await request(app)
        .get(`/api/teacher/sessions/${initializedSessionId}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      const students = rosterRes.body.data.students;

      const records = students.map((s: any, idx: number) => ({
        studentId: s.studentId,
        status: idx === 0 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
        absenceReasonId: null,
        remarks: idx === 0 ? 'Absent without note' : null,
      }));

      const res = await request(app)
        .post(`/api/teacher/sessions/${initializedSessionId}/attendance`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ records });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
    });

    it('PUT /api/teacher/sessions/:sessionId/attendance - update student attendance', async () => {
      const rosterRes = await request(app)
        .get(`/api/teacher/sessions/${initializedSessionId}`)
        .set('Authorization', `Bearer ${teacherToken}`);
      const students = rosterRes.body.data.students;

      const records = students.map((s: any) => ({
        studentId: s.studentId,
        status: AttendanceStatus.PRESENT,
        absenceReasonId: null,
      }));

      const res = await request(app)
        .put(`/api/teacher/sessions/${initializedSessionId}/attendance`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ records });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/teacher/sessions/:sessionId/attendance - forbidden for unassigned teacher', async () => {
      const res = await request(app)
        .post(`/api/teacher/sessions/${initializedSessionId}/attendance`)
        .set('Authorization', `Bearer ${teacher2Token}`)
        .send({
          records: [
            {
              studentId: '00000000-0000-0000-0000-000000000000',
              status: 'PRESENT',
            },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Forbidden/i);
    });
  });
});
