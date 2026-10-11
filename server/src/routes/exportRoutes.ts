import { Router } from 'express';
import {
  downloadStudentPDF,
  downloadConsolidatedPDF,
  downloadCSV,
  downloadExcel,
} from '../controllers/exportController';

const router = Router();

// Student individual PDF download (publicly accessible with valid participantId)
router.get('/quiz/:quizId/participant/:participantId/pdf', downloadStudentPDF);

// Consolidated reports (accessible for report downloads)
router.get('/quiz/:quizId/consolidated/pdf', downloadConsolidatedPDF);
router.get('/quiz/:quizId/csv', downloadCSV);
router.get('/quiz/:quizId/excel', downloadExcel);

export default router;
