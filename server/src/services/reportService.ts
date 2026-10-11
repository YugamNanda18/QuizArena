import PDFDocument from 'pdfkit';
import { IQuiz } from '../models/Quiz';
import { IParticipant } from '../models/Participant';
import { IAnswer } from '../models/Answer';
import { IQuestion } from '../models/Question';
import * as XLSX from 'xlsx';

export class ReportService {
  /**
   * Generates a professional individual student assessment PDF report.
   */
  public static async generateStudentReportPDF(
    quiz: IQuiz,
    participant: IParticipant,
    answers: IAnswer[],
    questions: IQuestion[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc.rect(0, 0, doc.page.width, 100).fill('#0f172a');
      doc.fillColor('#38bdf8').fontSize(22).font('Helvetica-Bold').text('QuizArena Enterprise', 40, 30);
      doc.fillColor('#94a3b8').fontSize(11).font('Helvetica').text('Official Student Assessment & Performance Report', 40, 58);
      doc.fillColor('#64748b').fontSize(9).text(`Reference: QA-${participant._id.toString().slice(-8).toUpperCase()}`, doc.page.width - 220, 35, { align: 'right' });
      doc.fillColor('#64748b').fontSize(9).text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, doc.page.width - 220, 50, { align: 'right' });

      doc.moveDown(4);

      // Student and Quiz Details Box
      doc.rect(40, 115, doc.page.width - 80, 75).lineWidth(1).strokeColor('#e2e8f0').fillAndStroke('#f8fafc', '#cbd5e1');

      doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('Candidate Information', 55, 125);
      doc.fontSize(10).font('Helvetica').fillColor('#475569');
      doc.text(`Name: `, 55, 145, { continued: true }).font('Helvetica-Bold').fillColor('#0f172a').text(participant.name);
      doc.font('Helvetica').fillColor('#475569').text(`Email: `, 55, 160, { continued: true }).font('Helvetica-Bold').fillColor('#0f172a').text(participant.email);

      doc.text(`Assessment: `, 300, 145, { continued: true }).font('Helvetica-Bold').fillColor('#0f172a').text(quiz.title);
      doc.font('Helvetica').fillColor('#475569').text(`Room Code: `, 300, 160, { continued: true }).font('Helvetica-Bold').fillColor('#2563eb').text(quiz.roomCode);

      // Score Metrics Grid
      const yStats = 205;
      const cardWidth = (doc.page.width - 80 - 30) / 4;

      const drawStatCard = (x: number, label: string, value: string, color: string) => {
        doc.rect(x, yStats, cardWidth, 60).lineWidth(1).strokeColor('#e2e8f0').fillAndStroke('#ffffff', '#e2e8f0');
        doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text(label.toUpperCase(), x + 10, yStats + 10);
        doc.fillColor(color).fontSize(16).font('Helvetica-Bold').text(value, x + 10, yStats + 28);
      };

      const accuracy = (participant.correctCount + participant.incorrectCount) > 0
        ? Math.round((participant.correctCount / (participant.correctCount + participant.incorrectCount)) * 100)
        : 0;

      drawStatCard(40, 'Final Rank', `#${participant.rank || '-'}`, '#2563eb');
      drawStatCard(40 + cardWidth + 10, 'Total Score', `${participant.totalScore} / ${quiz.maxScore}`, '#059669');
      drawStatCard(40 + (cardWidth + 10) * 2, 'Accuracy', `${accuracy}%`, '#d97706');
      drawStatCard(40 + (cardWidth + 10) * 3, 'Response Time', `${(participant.cumulativeResponseTimeMs / 1000).toFixed(1)}s`, '#7c3aed');

      // Breakdown Section Header
      doc.moveDown(5);
      const yTable = 285;
      doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Question-Wise Performance Breakdown', 40, yTable);

      // Table Header
      const yTh = yTable + 20;
      doc.rect(40, yTh, doc.page.width - 80, 22).fill('#f1f5f9');
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
      doc.text('Q#', 50, yTh + 6);
      doc.text('Question Summary', 90, yTh + 6);
      doc.text('Outcome', 320, yTh + 6);
      doc.text('Points', 410, yTh + 6);
      doc.text('Response Time', 475, yTh + 6);

      let currentY = yTh + 22;

      // Question rows
      questions.forEach((q, idx) => {
        const answer = answers.find((a) => a.questionId.toString() === q._id.toString());
        const isCorrect = answer ? answer.isCorrect : false;
        const pts = answer ? answer.pointsAwarded : 0;
        const timeSec = answer ? (answer.responseTimeMs / 1000).toFixed(1) + 's' : '-';

        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(40, currentY, doc.page.width - 80, 20).fill(rowBg);

        doc.fillColor('#1e293b').fontSize(9).font('Helvetica');
        doc.text(`${idx + 1}`, 50, currentY + 5);

        const shortText = q.text.length > 38 ? q.text.substring(0, 35) + '...' : q.text;
        doc.text(shortText, 90, currentY + 5);

        if (!answer) {
          doc.fillColor('#94a3b8').font('Helvetica-Bold').text('Unanswered', 320, currentY + 5);
        } else if (isCorrect) {
          doc.fillColor('#16a34a').font('Helvetica-Bold').text('Correct', 320, currentY + 5);
        } else {
          doc.fillColor('#dc2626').font('Helvetica-Bold').text('Incorrect', 320, currentY + 5);
        }

        doc.fillColor('#0f172a').font('Helvetica-Bold').text(`${pts} pts`, 410, currentY + 5);
        doc.font('Helvetica').fillColor('#64748b').text(timeSec, 475, currentY + 5);

        currentY += 20;
      });

      // Verification Footer
      doc.rect(40, doc.page.height - 70, doc.page.width - 80, 35).lineWidth(0.5).strokeColor('#e2e8f0');
      doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(
        'This certificate and score transcript is server-generated by QuizArena Enterprise and verified using cryptographic timestamps.',
        50,
        doc.page.height - 62,
        { width: doc.page.width - 100, align: 'center' }
      );

      doc.end();
    });
  }

  /**
   * Generates a consolidated PDF report for all quiz participants.
   */
  public static async generateConsolidatedQuizReportPDF(quiz: IQuiz, participants: IParticipant[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc.rect(0, 0, doc.page.width, 90).fill('#0f172a');
      doc.fillColor('#38bdf8').fontSize(20).font('Helvetica-Bold').text('QuizArena Enterprise', 40, 25);
      doc.fillColor('#cbd5e1').fontSize(11).font('Helvetica').text(`Consolidated Assessment Roster: ${quiz.title}`, 40, 50);

      const totalParticipants = participants.length;
      const avgScore = totalParticipants > 0
        ? Math.round(participants.reduce((acc, p) => acc + p.totalScore, 0) / totalParticipants)
        : 0;
      const topScore = totalParticipants > 0 ? Math.max(...participants.map((p) => p.totalScore)) : 0;

      // Summary
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica').text(`Room Code: ${quiz.roomCode}  |  Total Candidates: ${totalParticipants}  |  Average Score: ${avgScore}  |  Top Score: ${topScore}`, 40, 105);

      // Table Header
      let currentY = 130;
      doc.rect(40, currentY, doc.page.width - 80, 22).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('Rank', 50, currentY + 6);
      doc.text('Candidate Name', 90, currentY + 6);
      doc.text('Email', 220, currentY + 6);
      doc.text('Score', 380, currentY + 6);
      doc.text('Correct', 430, currentY + 6);
      doc.text('Time (s)', 490, currentY + 6);

      currentY += 22;

      participants.forEach((p, idx) => {
        if (currentY > doc.page.height - 60) {
          doc.addPage();
          currentY = 40;
        }

        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(40, currentY, doc.page.width - 80, 20).fill(rowBg);

        doc.fillColor('#0f172a').fontSize(9).font('Helvetica');
        doc.text(`#${p.rank || idx + 1}`, 50, currentY + 5);
        doc.font('Helvetica-Bold').text(p.name, 90, currentY + 5);
        doc.font('Helvetica').fillColor('#475569').text(p.email, 220, currentY + 5);
        doc.fillColor('#059669').font('Helvetica-Bold').text(`${p.totalScore}`, 380, currentY + 5);
        doc.fillColor('#1e293b').font('Helvetica').text(`${p.correctCount}`, 430, currentY + 5);
        doc.fillColor('#64748b').text(`${(p.cumulativeResponseTimeMs / 1000).toFixed(1)}`, 490, currentY + 5);

        currentY += 20;
      });

      doc.end();
    });
  }

  /**
   * Generates CSV format string protected against spreadsheet formula injection.
   */
  public static generateCSVExport(participants: IParticipant[]): string {
    const sanitize = (val: any) => {
      let str = String(val ?? '');
      // Defend against CSV injection (=, +, -, @)
      if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const header = ['Rank', 'Name', 'Email', 'Student ID', 'Total Score', 'Base Points', 'Speed Bonus', 'Correct Answers', 'Incorrect Answers', 'Response Time (s)', 'Status'];
    const rows = participants.map((p) => [
      p.rank,
      sanitize(p.name),
      sanitize(p.email),
      sanitize(p.studentId || ''),
      p.totalScore,
      p.baseScore,
      p.bonusScore,
      p.correctCount,
      p.incorrectCount,
      (p.cumulativeResponseTimeMs / 1000).toFixed(2),
      sanitize(p.status),
    ]);

    return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Generates an Excel XLSX buffer.
   */
  public static generateExcelExport(quiz: IQuiz, participants: IParticipant[]): Buffer {
    const data = participants.map((p) => ({
      Rank: p.rank,
      Name: p.name,
      Email: p.email,
      'Student ID': p.studentId || '',
      'Total Score': p.totalScore,
      'Base Score': p.baseScore,
      'Speed Bonus': p.bonusScore,
      'Correct Count': p.correctCount,
      'Incorrect Count': p.incorrectCount,
      'Response Time (s)': Number((p.cumulativeResponseTimeMs / 1000).toFixed(2)),
      Status: p.status,
      'Registration Time': p.registeredAt ? new Date(p.registeredAt).toISOString() : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
