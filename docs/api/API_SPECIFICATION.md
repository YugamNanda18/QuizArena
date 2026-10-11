# QuizArena Enterprise — REST API & WebSocket Protocol

All versioned REST endpoints are mounted under `/api/v1`.

## 1. Authentication
- `POST /api/v1/auth/login`: Authenticate administrator. Body: `{ email, password }`. Returns JWT token.
- `GET /api/v1/auth/me`: Retrieve current user profile (requires Bearer token).

## 2. Assessment Management
- `GET /api/v1/quizzes`: List all quizzes (Admin).
- `GET /api/v1/quizzes/:id`: Get quiz by ID.
- `GET /api/v1/quizzes/room/:roomCode`: Get sanitized quiz info by room code (Public for candidates).
- `POST /api/v1/quizzes`: Create quiz with scoring parameters (Admin).
- `PUT /api/v1/quizzes/:id`: Update quiz settings (Admin).
- `PATCH /api/v1/quizzes/:id/status`: Transition state (`WAITING`, `LIVE`, `PAUSED`, `RESUMED`, `COMPLETED`).
- `POST /api/v1/quizzes/:id/duplicate`: Clone quiz and its question bank.
- `DELETE /api/v1/quizzes/:id`: Delete quiz, questions, and records.

## 3. Question Bank & Dynamic Scoring
- `GET /api/v1/questions/quiz/:quizId`: Get questions (sanitized for candidates during test; answer keys stripped).
- `POST /api/v1/questions/quiz/:quizId`: Add question with configurable points.
- `PATCH /api/v1/questions/quiz/:quizId/bulk-points`: Bulk configure point values across questions.
- `PUT /api/v1/questions/:questionId`: Edit question.
- `DELETE /api/v1/questions/:questionId`: Remove question.

## 4. Candidate Registration & Rooms
- `POST /api/v1/registration`: Register candidate for quiz. Prevents duplicate registration.
- `GET /api/v1/registration/participant/:participantId`: Get candidate status, score, rank, and deadline.
- `GET /api/v1/registration/quiz/:quizId`: List participants (Admin).

## 5. Live Answers & Scoring
- `POST /api/v1/answers/submit`: Submit MCQ option. Returns confirmed score, points awarded, and live rank.
- `GET /api/v1/answers/quiz/:quizId/participant/:participantId`: Get candidate's submitted answers.

## 6. Leaderboard & Results
- `GET /api/v1/leaderboard/quiz/:quizId`: Current authoritative leaderboard snapshot.
- `GET /api/v1/leaderboard/quiz/:quizId/participant/:participantId`: Final candidate performance breakdown.

## 7. Certified Exports & Reports
- `GET /api/v1/export/quiz/:quizId/participant/:participantId/pdf`: Official Student PDF Transcript.
- `GET /api/v1/export/quiz/:quizId/consolidated/pdf`: Consolidated Assessment PDF Roster.
- `GET /api/v1/export/quiz/:quizId/csv`: Sanitized CSV Export.
- `GET /api/v1/export/quiz/:quizId/excel`: Formatted Excel Workbook (.xlsx).

## 8. WebSocket Events (Socket.IO)
- `quiz:join`: Join quiz room (`{ quizId, participantId, role }`).
- `quiz:started`: Emitted to all clients when test starts (`{ quizId, startTime, deadline }`).
- `quiz:paused`: Emitted when test paused.
- `quiz:resumed`: Emitted when test resumed.
- `quiz:ended`: Emitted when test finalized.
- `participant:count`: Broadcasts current online candidate count.
- `leaderboard:updated`: Emitted immediately upon any accepted answer submission.
