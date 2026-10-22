import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'University Attendance Management System API',
      version: '1.0.0',
      description:
        'RESTful API Backend for Web Admin Dashboard and Teacher Mobile Application.',
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [], // OpenAPI documentation declared programmatically below
};

export const swaggerSpec = swaggerJsdoc(options);
// Custom documentation object
export const openApiDocumentation = {
  openapi: '3.0.0',
  info: {
    title: 'University Attendance Management System API',
    version: '1.0.0',
    description: 'REST API backend for Web Admin Dashboard and Mobile Teacher Application.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'User Login',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@university.edu' },
                  password: { type: 'string', example: 'AdminPass123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully with JWT token' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get Current Authenticated User Profile',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User profile data' } },
      },
    },
    '/admin/dashboard': {
      get: {
        summary: 'Admin Dashboard Analytics Overview',
        tags: ['Admin Dashboard'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Dashboard metrics (students, teachers, sessions, missing alerts)' } },
      },
    },
    '/admin/attendance/missing': {
      get: {
        summary: 'Missing Attendance Sessions Detection Alert',
        tags: ['Admin Dashboard'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of scheduled sessions where attendance has not been recorded' } },
      },
    },
    '/admin/timetable/import/preview': {
      post: {
        summary: 'Upload Excel/CSV Timetable File to Preview & Detect Conflicts',
        tags: ['Timetable Importer'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                  timetableVersionId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Import preview with valid and error rows' } },
      },
    },
    '/admin/timetable/import/confirm': {
      post: {
        summary: 'Confirm Valid Timetable Import Batch',
        tags: ['Timetable Importer'],
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Batch inserted into timetable version' } },
      },
    },
    '/teacher/schedule/today': {
      get: {
        summary: "Teacher's Today Schedule with Attendance Completion Status",
        tags: ['Teacher Mobile App'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Today's classes list" } },
      },
    },
    '/teacher/sessions/{sessionId}/attendance': {
      post: {
        summary: 'Submit Student Attendance Records for Session',
        tags: ['Teacher Mobile App'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Attendance records saved' } },
      },
    },
  },
};
