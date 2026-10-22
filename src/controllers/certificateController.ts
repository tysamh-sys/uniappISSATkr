import { Request, Response, NextFunction } from 'express';
import * as certificateService from '../services/certificateService.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';

export async function getCertificatesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      studentId: req.query.studentId as string | undefined,
      status: req.query.status as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };
    const certificates = await certificateService.listCertificates(filters);
    return sendSuccess(res, certificates, 'Certificates retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getCertificateByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const cert = await certificateService.getCertificateById(req.params.id);
    return sendSuccess(res, cert, 'Certificate retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Certificate not found', 404);
  }
}

export async function uploadCertificateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const reviewerUserId = req.user?.id;
    const cert = await certificateService.uploadCertificate({
      ...req.body,
      uploadedByUserId: reviewerUserId,
    });
    return sendSuccess(res, cert, 'Certificate uploaded successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to upload certificate', 400);
  }
}

export async function reviewCertificateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { decision, note } = req.body;
    const reviewerUserId = req.user?.id;
    const cert = await certificateService.reviewCertificate(req.params.id, decision, note, reviewerUserId);
    return sendSuccess(res, cert, 'Certificate reviewed successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to review certificate', 400);
  }
}

export async function deleteCertificateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await certificateService.deleteCertificate(req.params.id);
    return sendSuccess(res, null, 'Certificate deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete certificate', 400);
  }
}
