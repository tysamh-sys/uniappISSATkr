import app from './app.js';
import { ENV } from './config/env.js';
import prisma from './config/database.js';

const PORT = ENV.PORT;

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ PostgreSQL database connected successfully via Prisma');

    app.listen(PORT, () => {
      console.log(`🚀 University Attendance Backend Server listening on port ${PORT}`);
      console.log(`📚 Swagger OpenAPI Documentation available at http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
