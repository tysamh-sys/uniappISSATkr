import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { ENV } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/errorHandlerMiddleware.js';
import { openApiDocumentation } from './docs/swagger.js';

const app: Express = express();

// Middlewares
app.use(cors({ origin: ENV.CORS_ORIGIN }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Swagger OpenAPI Documentation UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocumentation));

// API Routes
app.use('/api', apiRouter);

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
