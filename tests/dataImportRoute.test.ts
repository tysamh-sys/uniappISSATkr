import request from 'supertest';
import { Role } from '@prisma/client';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { generateTestUniversityWorkbook } from '../src/services/dataImport/sampleDatasetService';

describe('Admin Data Import Security & Route Tests', () => {
  const adminToken = generateToken({
    id: 'test-admin-uuid',
    email: 'admin@issatk.rnu.tn',
    role: Role.ADMIN,
  });

  const teacherToken = generateToken({
    id: 'test-teacher-uuid',
    email: 'enseignant@issatk.rnu.tn',
    role: Role.TEACHER,
  });

  const studentToken = generateToken({
    id: 'test-student-uuid',
    email: 'etudiant@issatk.rnu.tn',
    role: Role.STUDENT,
  });

  describe('Security & Role Restrictions (Admin Only)', () => {
    it('rejects unauthenticated requests to /api/admin/import/analyze with 401', async () => {
      const res = await request(app).post('/api/admin/import/analyze');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects teacher role requests with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/import/analyze')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects student role requests with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/import/analyze')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects non-admin access to import history with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/import/history')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Admin Authorized Endpoints', () => {
    it('POST /api/admin/import/analyze - returns sheet breakdown and suggested mappings for admin', async () => {
      const sampleWorkbook = generateTestUniversityWorkbook();

      const res = await request(app)
        .post('/api/admin/import/analyze')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', sampleWorkbook, 'test_dataset.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalSheets).toBe(8);
      expect(res.body.data.fileToken).toBeDefined();

      const studentSheet = res.body.data.sheets.find((s: any) => s.sheetName === 'Students');
      expect(studentSheet).toBeDefined();
      expect(studentSheet.suggestedEntity).toBe('STUDENT');
      expect(studentSheet.suggestedMappings.studentNumber).toBe('student_number');
    });

    it('GET /api/admin/import/sample-dataset - allows admin to download sample test Excel workbook', async () => {
      const res = await request(app)
        .get('/api/admin/import/sample-dataset')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(Number(res.headers['content-length'])).toBeGreaterThan(1000);
    });
  });
});
