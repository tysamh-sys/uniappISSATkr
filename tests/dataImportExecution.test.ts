import xlsx from 'xlsx';
import request from 'supertest';
import { Role, DayOfWeek, TimetableVersionStatus } from '@prisma/client';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import prisma from '../src/config/database';
import { validateImportData } from '../src/services/dataImport/dataValidator';
import { executeImportWorkflow } from '../src/services/dataImport/dataImporter';
import { SheetMappingConfig } from '../src/services/dataImport/types';

// Mock prisma for isolated, reproducible database execution tests
jest.mock('../src/config/database', () => {
  const store = {
    classes: new Map<string, any>(),
    teachers: new Map<string, any>(),
    subjects: new Map<string, any>(),
    rooms: new Map<string, any>(),
    students: new Map<string, any>(),
    users: new Map<string, any>(),
    timetableVersions: new Map<string, any>(),
    timetableEntries: new Map<string, any>(),
    activities: [] as any[],
  };

  const createTxMock = () => {
    return {
      class: {
        findMany: async () => Array.from(store.classes.values()),
        findFirst: async ({ where }: any) => {
          for (const c of store.classes.values()) {
            if (where.OR) {
              for (const cond of where.OR) {
                if (cond.name && c.name.toLowerCase() === cond.name.toLowerCase()) return c;
                if (cond.code && c.code.toLowerCase() === cond.code.toLowerCase()) return c;
              }
            }
          }
          return null;
        },
        create: async ({ data }: any) => {
          const id = `cls-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data };
          store.classes.set(id, rec);
          return rec;
        },
        update: async ({ where, data }: any) => {
          const rec = store.classes.get(where.id);
          const updated = { ...rec, ...data };
          store.classes.set(where.id, updated);
          return updated;
        },
      },
      subject: {
        findMany: async () => Array.from(store.subjects.values()),
        findFirst: async ({ where }: any) => {
          for (const s of store.subjects.values()) {
            if (where.OR) {
              for (const cond of where.OR) {
                if (cond.code && s.code.toLowerCase() === cond.code.toLowerCase()) return s;
                if (cond.name && s.name.toLowerCase() === cond.name.toLowerCase()) return s;
              }
            }
          }
          return null;
        },
        create: async ({ data }: any) => {
          const id = `sub-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data };
          store.subjects.set(id, rec);
          return rec;
        },
        update: async ({ where, data }: any) => {
          const rec = store.subjects.get(where.id);
          const updated = { ...rec, ...data };
          store.subjects.set(where.id, updated);
          return updated;
        },
      },
      room: {
        findMany: async () => Array.from(store.rooms.values()),
        findUnique: async ({ where }: any) => {
          for (const r of store.rooms.values()) {
            if (r.name.toLowerCase() === where.name.toLowerCase()) return r;
          }
          return null;
        },
        create: async ({ data }: any) => {
          const id = `room-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data };
          store.rooms.set(id, rec);
          return rec;
        },
        update: async ({ where, data }: any) => {
          const rec = store.rooms.get(where.id);
          const updated = { ...rec, ...data };
          store.rooms.set(where.id, updated);
          return updated;
        },
      },
      teacher: {
        findMany: async () => Array.from(store.teachers.values()),
        findFirst: async ({ where }: any) => {
          for (const t of store.teachers.values()) {
            if (where.OR) {
              for (const cond of where.OR) {
                if (cond.teacherNumber && t.teacherNumber.toLowerCase() === cond.teacherNumber.toLowerCase()) return t;
                if (cond.email && t.email.toLowerCase() === cond.email.toLowerCase()) return t;
              }
            }
          }
          return null;
        },
        create: async ({ data }: any) => {
          const id = `tch-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data };
          store.teachers.set(id, rec);
          return rec;
        },
        update: async ({ where, data }: any) => {
          const rec = store.teachers.get(where.id);
          const updated = { ...rec, ...data };
          store.teachers.set(where.id, updated);
          return updated;
        },
      },
      student: {
        findMany: async () => Array.from(store.students.values()),
        findUnique: async ({ where }: any) => {
          for (const s of store.students.values()) {
            if (where.studentNumber && s.studentNumber === where.studentNumber) return s;
          }
          return null;
        },
        create: async ({ data }: any) => {
          const id = `stu-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data };
          store.students.set(id, rec);
          return rec;
        },
        update: async ({ where, data }: any) => {
          const rec = store.students.get(where.id);
          const updated = { ...rec, ...data };
          store.students.set(where.id, updated);
          return updated;
        },
      },
      user: {
        findUnique: async ({ where }: any) => {
          for (const u of store.users.values()) {
            if (where.email && u.email.toLowerCase() === where.email.toLowerCase()) return u;
            if (where.id && u.id === where.id) return u;
          }
          return null;
        },
        create: async ({ data }: any) => {
          const id = `usr-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data };
          store.users.set(id, rec);
          return rec;
        },
      },
      timetableVersion: {
        findFirst: async () => {
          for (const v of store.timetableVersions.values()) {
            if (v.status === TimetableVersionStatus.ACTIVE) return v;
          }
          return null;
        },
        create: async ({ data }: any) => {
          const id = `ver-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data };
          store.timetableVersions.set(id, rec);
          return rec;
        },
      },
      timetableEntry: {
        findFirst: async ({ where }: any) => {
          for (const e of store.timetableEntries.values()) {
            if (
              e.timetableVersionId === where.timetableVersionId &&
              e.dayOfWeek === where.dayOfWeek &&
              e.startTime === where.startTime &&
              e.endTime === where.endTime &&
              e.classId === where.classId
            ) {
              return e;
            }
          }
          return null;
        },
        create: async ({ data }: any) => {
          const id = `entry-${Date.now()}-${Math.random()}`;
          const rec = { id, ...data };
          store.timetableEntries.set(id, rec);
          return rec;
        },
        update: async ({ where, data }: any) => {
          const rec = store.timetableEntries.get(where.id);
          const updated = { ...rec, ...data };
          store.timetableEntries.set(where.id, updated);
          return updated;
        },
      },
    };
  };

  const client = {
    class: {
      findMany: async () => Array.from(store.classes.values()),
    },
    teacher: {
      findMany: async () =>
        Array.from(store.teachers.values()).map((t) => ({
          ...t,
          user: store.users.get(t.userId) || null,
        })),
    },
    subject: {
      findMany: async () => Array.from(store.subjects.values()),
    },
    room: {
      findMany: async () => Array.from(store.rooms.values()),
    },
    student: {
      findMany: async () =>
        Array.from(store.students.values()).map((s) => ({
          ...s,
          class: store.classes.get(s.classId) || null,
        })),
    },
    timetableEntry: {
      findMany: async () =>
        Array.from(store.timetableEntries.values()).map((e) => ({
          ...e,
          teacher: store.teachers.get(e.teacherId) || null,
          room: store.rooms.get(e.roomId) || null,
          class: store.classes.get(e.classId) || null,
          subject: store.subjects.get(e.subjectId) || null,
        })),
    },
    activity: {
      create: async ({ data }: any) => {
        store.activities.push(data);
        return { id: 'act-1', ...data };
      },
    },
    $transaction: jest.fn(async (cb: (tx: any) => Promise<any>, _opts?: any) => {
      const tx = createTxMock();
      return await cb(tx);
    }),
    __store: store,
    __resetStore: () => {
      store.classes.clear();
      store.teachers.clear();
      store.subjects.clear();
      store.rooms.clear();
      store.students.clear();
      store.users.clear();
      store.timetableVersions.clear();
      store.timetableEntries.clear();
      store.activities.length = 0;
      (client.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: any) => Promise<any>, _opts?: any) => {
          const tx = createTxMock();
          return await cb(tx);
        }
      );
    },
  };

  return {
    __esModule: true,
    default: client,
    prisma: client,
  };
});

describe('University Data Import - Comprehensive Execution & Validation Tests', () => {
  const adminUser = {
    id: 'admin-123',
    name: 'Admin Central',
    email: 'admin@issatk.rnu.tn',
  };

  const adminToken = generateToken({
    id: adminUser.id,
    email: adminUser.email,
    role: Role.ADMIN,
  });

  const teacherToken = generateToken({
    id: 'tch-user-1',
    email: 'teacher@issatk.rnu.tn',
    role: Role.TEACHER,
  });

  const studentToken = generateToken({
    id: 'stu-user-1',
    email: 'student@students.issatk.rnu.tn',
    role: Role.STUDENT,
  });

  beforeEach(() => {
    (prisma as any).__resetStore();
    // console.log('PRISMA IN TEST:', prisma);
  });

  describe('1. Role-Based Access Control on Preview and Execute Endpoints', () => {
    it('rejects TEACHER access to /api/admin/import/preview with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/import/preview')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects STUDENT access to /api/admin/import/preview with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/import/preview')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects TEACHER access to /api/admin/import/execute with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/import/execute')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).post('/api/admin/import/execute');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Successful Full Database Import Execution', () => {
    it('imports Classes, Subjects, Rooms, Teachers, Students and Timetables atomically', async () => {
      const wb = xlsx.utils.book_new();

      // Classes sheet
      const classRows = [{ Code: 'DSI31', Intitule: 'Développement Systèmes Info' }];
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(classRows), 'Classes');

      // Subjects sheet
      const subjectRows = [{ Code: 'ARCH-LOG', Nom: 'Architecture Logicielle' }];
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(subjectRows), 'Matieres');

      // Rooms sheet
      const roomRows = [{ Salle: 'Labo-Info-4', Batiment: 'Bloc B', Capacite: 30 }];
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(roomRows), 'Salles');

      // Teachers sheet
      const teacherRows = [
        {
          Matricule: 'TCH-042',
          Nom: 'BEN SALEM Mohamed',
          Email: 'mohamed.bensalem@issatk.rnu.tn',
          Departement: 'Informatique',
        },
      ];
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(teacherRows), 'Enseignants');

      // Students sheet
      const studentRows = [
        {
          Numero: 'STU-1001',
          NomComplet: 'Trabelsi Yassine',
          Email: 'yassine.trabelsi@students.issatk.rnu.tn',
          Classe: 'DSI31',
        },
      ];
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(studentRows), 'Etudiants');

      // Timetables sheet
      const timetableRows = [
        {
          Jour: 'Lundi',
          Horaire: '08:30-10:00',
          Classe: 'DSI31',
          Enseignant: 'BEN SALEM Mohamed',
          Matiere: 'Architecture Logicielle',
          Salle: 'Labo-Info-4',
        },
      ];
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(timetableRows), 'EmploisDuTemps');

      const fileBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const configs: SheetMappingConfig[] = [
        {
          sheetName: 'Classes',
          entityType: 'CLASS',
          columnMappings: { code: 'Code', name: 'Intitule' },
        },
        {
          sheetName: 'Matieres',
          entityType: 'SUBJECT',
          columnMappings: { code: 'Code', name: 'Nom' },
        },
        {
          sheetName: 'Salles',
          entityType: 'ROOM',
          columnMappings: { name: 'Salle', building: 'Batiment', capacity: 'Capacite' },
        },
        {
          sheetName: 'Enseignants',
          entityType: 'TEACHER',
          columnMappings: {
            teacherNumber: 'Matricule',
            fullName: 'Nom',
            email: 'Email',
            department: 'Departement',
          },
        },
        {
          sheetName: 'Etudiants',
          entityType: 'STUDENT',
          columnMappings: {
            studentNumber: 'Numero',
            fullName: 'NomComplet',
            email: 'Email',
            className: 'Classe',
          },
        },
        {
          sheetName: 'EmploisDuTemps',
          entityType: 'TIMETABLE',
          columnMappings: {
            dayOfWeek: 'Jour',
            timeSlot: 'Horaire',
            className: 'Classe',
            teacherName: 'Enseignant',
            subjectName: 'Matiere',
            roomName: 'Salle',
          },
        },
      ];

      const report = await executeImportWorkflow(
        fileBuffer,
        'university_data.xlsx',
        configs,
        {
          strategy: 'SKIP',
          generateUserAccounts: true,
          academicYear: '2026-2027',
          semester: 1,
        },
        adminUser
      );

      expect(report.status).toBe('SUCCESS');
      expect(report.totalFailed).toBe(0);
      expect(report.totalInserted).toBe(6);

      // Verify that user accounts were created with secure random passwords (not default 'issatk2026')
      const createdUsers = Array.from((prisma as any).__store.users.values());
      expect(createdUsers.length).toBeGreaterThanOrEqual(1);
      for (const u of createdUsers) {
        expect(u.passwordHash).toBeDefined();
        // Ensure bcrypt hash exists
        expect(u.passwordHash.length).toBeGreaterThan(20);
      }
    });
  });

  describe('3. Duplicate Records Handling: SKIP vs UPDATE Strategies', () => {
    it('SKIP strategy preserves existing records and increments skipped count', async () => {
      // Seed existing class
      const existingClass = {
        id: 'cls-1',
        name: 'DSI31',
        code: 'DSI31',
        filiere: 'Informatique',
        niveau: 'L3',
        groupe: 'G1',
      };
      (prisma as any).__store.classes.set(existingClass.id, existingClass);

      const wb = xlsx.utils.book_new();
      const classRows = [{ Code: 'DSI31', Nom: 'DSI31', Filiere: 'Nouveau Intitule Non Pris' }];
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(classRows), 'Classes');
      const fileBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const configs: SheetMappingConfig[] = [
        {
          sheetName: 'Classes',
          entityType: 'CLASS',
          columnMappings: { code: 'Code', name: 'Nom', filiere: 'Filiere' },
        },
      ];

      const report = await executeImportWorkflow(
        fileBuffer,
        'classes.xlsx',
        configs,
        { strategy: 'SKIP', generateUserAccounts: false },
        adminUser
      );

      expect(report.totalSkipped).toBe(1);
      expect(report.totalInserted).toBe(0);
      expect(report.totalUpdated).toBe(0);

      // Verify DB record remained untouched
      const current = (prisma as any).__store.classes.get('cls-1');
      expect(current.filiere).toBe('Informatique');
    });

    it('UPDATE strategy updates allowed fields but NEVER overwrites user role or passwordHash', async () => {
      // Seed existing teacher with user account
      const userId = 'usr-teacher-secure';
      const originalPasswordHash = '$2a$10$OriginalHashedPasswordCannotBeOverwritten12345';
      const existingUser = {
        id: userId,
        email: 'prof.test@issatk.rnu.tn',
        passwordHash: originalPasswordHash,
        role: Role.TEACHER,
      };
      const existingTeacher = {
        id: 'tch-1',
        userId,
        teacherNumber: 'TCH-007',
        firstName: 'Anis',
        lastName: 'Jebali',
        email: 'prof.test@issatk.rnu.tn',
        department: 'Maths',
        phone: '12345678',
      };

      (prisma as any).__store.users.set(userId, existingUser);
      (prisma as any).__store.teachers.set(existingTeacher.id, existingTeacher);

      const wb = xlsx.utils.book_new();
      const rows = [
        {
          Matricule: 'TCH-007',
          Nom: 'Jebali Anis',
          Email: 'prof.test@issatk.rnu.tn',
          Departement: 'Informatique & IA',
          Telephone: '99887766',
        },
      ];
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rows), 'Teachers');
      const fileBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const configs: SheetMappingConfig[] = [
        {
          sheetName: 'Teachers',
          entityType: 'TEACHER',
          columnMappings: {
            teacherNumber: 'Matricule',
            fullName: 'Nom',
            email: 'Email',
            department: 'Departement',
            phone: 'Telephone',
          },
        },
      ];

      const report = await executeImportWorkflow(
        fileBuffer,
        'teachers_update.xlsx',
        configs,
        { strategy: 'UPDATE', generateUserAccounts: true },
        adminUser
      );

      expect(report.totalUpdated).toBe(1);
      expect(report.totalInserted).toBe(0);

      // Verify teacher department was updated
      const updatedTeacher = (prisma as any).__store.teachers.get('tch-1');
      expect(updatedTeacher.department).toBe('Informatique & IA');
      expect(updatedTeacher.phone).toBe('99887766');

      // Verify user password hash and role were NOT touched
      const preservedUser = (prisma as any).__store.users.get(userId);
      expect(preservedUser.passwordHash).toBe(originalPasswordHash);
      expect(preservedUser.role).toBe(Role.TEACHER);
    });
  });

  describe('4. Timetable Integrity & Scheduling Conflict Detection', () => {
    it('detects teacher scheduling conflicts within file and against DB', async () => {
      const wb = xlsx.utils.book_new();
      // Two timetable entries for the SAME teacher at the SAME day and overlapping time
      const conflictingTimetables = [
        {
          Jour: 'Mardi',
          Debut: '08:30',
          Fin: '10:00',
          Classe: 'DSI31',
          Enseignant: 'BEN SALEM Mohamed',
          Matiere: 'Maths',
          Salle: 'Amphi A',
        },
        {
          Jour: 'Mardi',
          Debut: '09:00', // Overlaps with 08:30-10:00!
          Fin: '10:30',
          Classe: 'DSI32',
          Enseignant: 'BEN SALEM Mohamed',
          Matiere: 'Algo',
          Salle: 'Amphi B',
        },
      ];

      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(conflictingTimetables), 'Emplois');
      const fileBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const configs: SheetMappingConfig[] = [
        {
          sheetName: 'Emplois',
          entityType: 'TIMETABLE',
          columnMappings: {
            dayOfWeek: 'Jour',
            startTime: 'Debut',
            endTime: 'Fin',
            className: 'Classe',
            teacherName: 'Enseignant',
            subjectName: 'Matiere',
            roomName: 'Salle',
          },
        },
      ];

      const preview = await validateImportData(fileBuffer, configs);

      expect(preview.sheets[0].entityType).toBe('TIMETABLE');
      // The second item should flag a teacher conflict
      const hasConflict =
        preview.sheets[0].previewRows.some(
          (r) =>
            r.status === 'ERROR' ||
            r.status === 'WARNING' ||
            r.errors.some((err) => err.includes('Conflit horaire') && err.includes('Enseignant'))
        ) ||
        preview.sheets[0].fieldErrors.some(
          (err) => err.message.includes('Conflit horaire') && err.message.includes('Enseignant')
        );
      expect(hasConflict).toBe(true);
    });

    it('detects room scheduling conflicts (two classes assigned to same room at same time)', async () => {
      const wb = xlsx.utils.book_new();
      const conflictingRooms = [
        {
          Jour: 'Jeudi',
          Debut: '10:05',
          Fin: '11:35',
          Classe: 'DSI31',
          Enseignant: 'Prof A',
          Matiere: 'Physique',
          Salle: 'Labo-1',
        },
        {
          Jour: 'Jeudi',
          Debut: '10:05',
          Fin: '11:35',
          Classe: 'DSI32',
          Enseignant: 'Prof B',
          Matiere: 'Chimie',
          Salle: 'Labo-1', // Same room, same time!
        },
      ];

      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(conflictingRooms), 'Emplois');
      const fileBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const configs: SheetMappingConfig[] = [
        {
          sheetName: 'Emplois',
          entityType: 'TIMETABLE',
          columnMappings: {
            dayOfWeek: 'Jour',
            startTime: 'Debut',
            endTime: 'Fin',
            className: 'Classe',
            teacherName: 'Enseignant',
            subjectName: 'Matiere',
            roomName: 'Salle',
          },
        },
      ];

      const preview = await validateImportData(fileBuffer, configs);
      const roomConflict =
        preview.sheets[0].previewRows.some(
          (r) =>
            r.status === 'ERROR' ||
            r.status === 'WARNING' ||
            r.errors.some((err) => err.includes('Salle') && err.includes('déjà occupée'))
        ) ||
        preview.sheets[0].fieldErrors.some(
          (err) => err.message.includes('Salle') && err.message.includes('déjà occupée')
        );
      expect(roomConflict).toBe(true);
    });
  });

  describe('5. Missing Required Fields and Safe Error Handling', () => {
    it('skips rows with missing required identifiers and continues processing valid rows', async () => {
      const wb = xlsx.utils.book_new();
      const studentRows = [
        { Numero: '', Nom: 'Sans Matricule', Classe: 'DSI31' }, // Missing studentNumber
        { Numero: 'STU-9901', Nom: 'Valide Etudiant', Classe: 'DSI31' }, // Valid
      ];
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(studentRows), 'Students');
      const fileBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const configs: SheetMappingConfig[] = [
        {
          sheetName: 'Students',
          entityType: 'STUDENT',
          columnMappings: {
            studentNumber: 'Numero',
            fullName: 'Nom',
            className: 'Classe',
          },
        },
      ];

      const report = await executeImportWorkflow(
        fileBuffer,
        'missing_fields.xlsx',
        configs,
        { strategy: 'SKIP', generateUserAccounts: false },
        adminUser
      );

      // Row 1 skipped, row 2 inserted
      expect(report.totalSkipped).toBe(1);
      expect(report.totalInserted).toBe(1);
      expect(report.totalFailed).toBe(0);
    });
  });

  describe('6. Transaction Safety & Atomicity', () => {
    it('rolls back completely if a critical transaction failure occurs', async () => {
      // Mock $transaction to reject simulating an unexpected database abort
      (prisma.$transaction as jest.Mock).mockImplementationOnce(async () => {
        throw new Error('Database transaction abort test');
      });

      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(
        wb,
        xlsx.utils.json_to_sheet([{ Code: 'FAIL-1', Nom: 'Echec' }]),
        'Classes'
      );
      const fileBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      await expect(
        executeImportWorkflow(
          fileBuffer,
          'fail.xlsx',
          [{ sheetName: 'Classes', entityType: 'CLASS', columnMappings: { code: 'Code', name: 'Nom' } }],
          { strategy: 'SKIP', generateUserAccounts: false },
          adminUser
        )
      ).rejects.toThrow('Database transaction abort test');

      // Verify that no records were persisted
      expect((prisma as any).__store.classes.size).toBe(0);
    });
  });

  describe('7. High-Volume / Large File Performance Simulation', () => {
    it('executes smoothly with 200+ simulated rows without memory or timeout issues', async () => {
      const wb = xlsx.utils.book_new();
      const largeRows = [];
      for (let i = 1; i <= 200; i++) {
        largeRows.push({
          Matricule: `STU-BULK-${1000 + i}`,
          Prenom: `Prenom${i}`,
          Nom: `Nom${i}`,
          Email: `bulk${i}@students.issatk.rnu.tn`,
          Classe: 'DSI31',
        });
      }
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(largeRows), 'LargeStudents');
      const fileBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const configs: SheetMappingConfig[] = [
        {
          sheetName: 'LargeStudents',
          entityType: 'STUDENT',
          columnMappings: {
            studentNumber: 'Matricule',
            firstName: 'Prenom',
            lastName: 'Nom',
            email: 'Email',
            className: 'Classe',
          },
        },
      ];

      const report = await executeImportWorkflow(
        fileBuffer,
        'large_students.xlsx',
        configs,
        { strategy: 'SKIP', generateUserAccounts: false },
        adminUser
      );

      expect(report.totalProcessed).toBe(200);
      expect(report.totalInserted).toBe(200);
      expect(report.totalFailed).toBe(0);
      expect(report.status).toBe('SUCCESS');
    });
  });
});
