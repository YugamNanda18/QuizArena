import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { connectDB, disconnectDB } from '../config/db';
import { Quiz } from '../models/Quiz';
import { Question } from '../models/Question';
import { Participant } from '../models/Participant';
import { Answer } from '../models/Answer';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';

describe('QuizArena Enterprise End-to-End System Integration Tests', () => {
  let adminToken: string;
  let testQuizId: string;
  let testRoomCode: string;
  let question1Id: string;
  let question2Id: string;
  let question3Id: string;

  let student1Id: string;
  let student2Id: string;
  let student3Id: string;

  beforeAll(async () => {
    await connectDB();

    // Clean up test collections
    await User.deleteMany({ email: 'testadmin@quizarena.com' });
    await Quiz.deleteMany({ title: 'E2E Assessment Quiz' });

    // Seed test admin
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('TestAdmin@123', salt);
    await User.create({
      name: 'E2E Admin',
      email: 'testadmin@quizarena.com',
      passwordHash,
      role: 'admin',
    });

    // Login admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'testadmin@quizarena.com', password: 'TestAdmin@123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    adminToken = loginRes.body.token;
  }, 30000);

  afterAll(async () => {
    if (testQuizId) {
      await Question.deleteMany({ quizId: testQuizId });
      await Participant.deleteMany({ quizId: testQuizId });
      await Answer.deleteMany({ quizId: testQuizId });
      await Quiz.findByIdAndDelete(testQuizId);
    }
    await User.deleteMany({ email: 'testadmin@quizarena.com' });
    await disconnectDB();
  });

  it('Step 1: Admin creates quiz with dynamic points and negative marking', async () => {
    const res = await request(app)
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'E2E Assessment Quiz',
        description: 'Comprehensive automated test verifying real-time scoring and tie breaking',
        durationMinutes: 10,
        scoringSettings: {
          defaultPoints: 100,
          negativeMarkingEnabled: true,
          negativeMarks: 20,
          speedBonusEnabled: false,
        },
        registrationSettings: {
          requireStudentId: true,
          allowLateJoin: false,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.quiz.status).toBe('DRAFT');
    expect(res.body.quiz.roomCode).toBeDefined();
    testQuizId = res.body.quiz._id;
    testRoomCode = res.body.quiz.roomCode;
  });

  it('Step 2: Admin configures questions with varying dynamic point values', async () => {
    // Q1: 25 points
    const q1Res = await request(app)
      .post(`/api/v1/questions/quiz/${testQuizId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        text: 'What is the time complexity of binary search?',
        options: ['O(N)', 'O(log N)', 'O(N^2)', 'O(1)'],
        correctOptionIndex: 1,
        points: 25,
        negativeMarks: 5,
        explanation: 'Binary search halves the search space each step: O(log N)',
      });
    expect(q1Res.status).toBe(201);
    question1Id = q1Res.body.question._id;

    // Q2: 100 points
    const q2Res = await request(app)
      .post(`/api/v1/questions/quiz/${testQuizId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        text: 'Which protocol operates at the Transport Layer of the OSI model?',
        options: ['HTTP', 'TCP', 'IP', 'Ethernet'],
        correctOptionIndex: 1,
        points: 100,
        negativeMarks: 20,
      });
    expect(q2Res.status).toBe(201);
    question2Id = q2Res.body.question._id;

    // Q3: 500 points (Elite question)
    const q3Res = await request(app)
      .post(`/api/v1/questions/quiz/${testQuizId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        text: 'In Raft consensus, how many nodes are required to form a quorum in a 5-node cluster?',
        options: ['2', '3', '4', '5'],
        correctOptionIndex: 1,
        points: 500,
        negativeMarks: 50,
      });
    expect(q3Res.status).toBe(201);
    question3Id = q3Res.body.question._id;

    // Verify Quiz metrics auto-recalculated
    const quizRes = await request(app).get(`/api/v1/quizzes/${testQuizId}`);
    expect(quizRes.body.quiz.totalQuestions).toBe(3);
    expect(quizRes.body.quiz.maxScore).toBe(625); // 25 + 100 + 500
  });

  it('Step 3: Admin opens waiting room (status becomes WAITING)', async () => {
    const res = await request(app)
      .patch(`/api/v1/quizzes/${testQuizId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'WAITING' });

    expect(res.status).toBe(200);
    expect(res.body.quiz.status).toBe('WAITING');
  });

  it('Step 4: Three students register for the quiz', async () => {
    // Student 1 (Will be fast)
    const s1Res = await request(app)
      .post('/api/v1/registration')
      .send({
        quizId: testQuizId,
        name: 'Alice Swift',
        email: 'alice.swift@test.com',
        studentId: 'STU-001',
      });
    expect(s1Res.status).toBe(201);
    student1Id = s1Res.body.participant.id;

    // Student 2 (Will have same score as Student 1 but slower response time)
    const s2Res = await request(app)
      .post('/api/v1/registration')
      .send({
        quizId: testQuizId,
        name: 'Bob Slow',
        email: 'bob.slow@test.com',
        studentId: 'STU-002',
      });
    expect(s2Res.status).toBe(201);
    student2Id = s2Res.body.participant.id;

    // Student 3 (Solves the 500 pt question)
    const s3Res = await request(app)
      .post('/api/v1/registration')
      .send({
        quizId: testQuizId,
        name: 'Charlie Master',
        email: 'charlie.master@test.com',
        studentId: 'STU-003',
      });
    expect(s3Res.status).toBe(201);
    student3Id = s3Res.body.participant.id;

    // Verify duplicate registration is safely rejected or returns existing
    const dupRes = await request(app)
      .post('/api/v1/registration')
      .send({
        quizId: testQuizId,
        name: 'Alice Swift',
        email: 'alice.swift@test.com',
        studentId: 'STU-001',
      });
    expect(dupRes.body.reconnected).toBe(true);
  });

  it('Step 5: Student cannot access questions before proctor starts test', async () => {
    const res = await request(app).get(`/api/v1/questions/quiz/${testQuizId}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('protected');
  });

  it('Step 6: Admin starts quiz (status becomes LIVE, server sets authoritative deadline)', async () => {
    const res = await request(app)
      .patch(`/api/v1/quizzes/${testQuizId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'LIVE' });

    expect(res.status).toBe(200);
    expect(res.body.quiz.status).toBe('LIVE');
    expect(res.body.quiz.actualStartTime).toBeDefined();
    expect(res.body.quiz.deadline).toBeDefined();

    // Now student can access questions (without answer keys revealed)
    const qRes = await request(app).get(`/api/v1/questions/quiz/${testQuizId}`);
    expect(qRes.status).toBe(200);
    expect(qRes.body.questions.length).toBe(3);
    expect(qRes.body.questions[0].correctOptionIndex).toBeUndefined(); // Protected!
  });

  it('Step 7: Answers evaluated with immediate scoring and speed tie-breaking', async () => {
    // Student 1 (Alice): Answers Q1 (25 pts) and Q2 (100 pts) = 125 pts
    const s1q1 = await request(app).post('/api/v1/answers/submit').send({
      quizId: testQuizId,
      participantId: student1Id,
      questionId: question1Id,
      selectedOptionIndex: 1, // correct
    });
    expect(s1q1.body.pointsAwarded).toBe(25);

    const s1q2 = await request(app).post('/api/v1/answers/submit').send({
      quizId: testQuizId,
      participantId: student1Id,
      questionId: question2Id,
      selectedOptionIndex: 1, // correct
    });
    expect(s1q2.body.pointsAwarded).toBe(100);
    expect(s1q2.body.currentScore).toBe(125);

    // Student 2 (Bob): Answers Q1 (25 pts) and Q2 (100 pts) = 125 pts
    // Artificially simulate Bob taking more response time
    await Participant.findByIdAndUpdate(student2Id, { cumulativeResponseTimeMs: 80000 });
    const s2q1 = await request(app).post('/api/v1/answers/submit').send({
      quizId: testQuizId,
      participantId: student2Id,
      questionId: question1Id,
      selectedOptionIndex: 1,
    });
    const s2q2 = await request(app).post('/api/v1/answers/submit').send({
      quizId: testQuizId,
      participantId: student2Id,
      questionId: question2Id,
      selectedOptionIndex: 1,
    });
    expect(s2q2.body.currentScore).toBe(125);

    // Student 3 (Charlie): Answers Q3 (500 pts) = 500 pts
    const s3q3 = await request(app).post('/api/v1/answers/submit').send({
      quizId: testQuizId,
      participantId: student3Id,
      questionId: question3Id,
      selectedOptionIndex: 1, // correct
    });
    expect(s3q3.body.pointsAwarded).toBe(500);
    expect(s3q3.body.currentScore).toBe(500);

    // Verify Idempotency: Student 1 tries to submit Q1 again -> no double points!
    const s1q1Retry = await request(app).post('/api/v1/answers/submit').send({
      quizId: testQuizId,
      participantId: student1Id,
      questionId: question1Id,
      selectedOptionIndex: 1,
    });
    expect(s1q1Retry.body.idempotent).toBe(true);
    expect(s1q1Retry.body.currentScore).toBe(125); // Score stayed 125, not 150!
  });

  it('Step 8: Authoritative live leaderboard correctly ranks participants', async () => {
    const lbRes = await request(app).get(`/api/v1/leaderboard/quiz/${testQuizId}`);
    expect(lbRes.status).toBe(200);
    const lb = lbRes.body.leaderboard;

    expect(lb.length).toBe(3);

    // Rank 1: Charlie with 500 points (highest score wins)
    expect(lb[0].name).toBe('Charlie Master');
    expect(lb[0].rank).toBe(1);
    expect(lb[0].totalScore).toBe(500);

    // Rank 2 vs Rank 3: Alice and Bob both have 125 pts, but Alice has lower cumulative time
    expect(lb[1].name).toBe('Alice Swift');
    expect(lb[1].rank).toBe(2);

    expect(lb[2].name).toBe('Bob Slow');
    expect(lb[2].rank).toBe(3);
  });

  it('Step 9: PDF, CSV, and Excel downloads generate successfully', async () => {
    // Student individual PDF certificate
    const studentPdfRes = await request(app).get(`/api/v1/export/quiz/${testQuizId}/participant/${student1Id}/pdf`);
    expect(studentPdfRes.status).toBe(200);
    expect(studentPdfRes.headers['content-type']).toBe('application/pdf');
    expect(studentPdfRes.body.length).toBeGreaterThan(500);

    // Consolidated PDF
    const consolPdfRes = await request(app).get(`/api/v1/export/quiz/${testQuizId}/consolidated/pdf`);
    expect(consolPdfRes.status).toBe(200);
    expect(consolPdfRes.headers['content-type']).toBe('application/pdf');

    // CSV Export
    const csvRes = await request(app).get(`/api/v1/export/quiz/${testQuizId}/csv`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('Charlie Master');

    // Excel Export
    const excelRes = await request(app).get(`/api/v1/export/quiz/${testQuizId}/excel`);
    expect(excelRes.status).toBe(200);
    expect(excelRes.headers['content-type']).toContain('spreadsheet');
  });
});
