# QuizArena Enterprise — Security, Integrity & Compliance

## 1. Authentication & Role-Based Access Control (RBAC)
- **Passwords**: Salted and hashed using `bcrypt` (10 rounds). Plaintext passwords are never logged or stored.
- **JWT Authentication**: Cryptographically signed JSON Web Tokens (`HS256`) with configurable expiration.
- **Role Verification**: Admin-restricted endpoints enforce server-level role verification (`requireAdmin`), never relying solely on client-side routing.

## 2. Server-Side Integrity & Cheat Prevention
- **Answer Key Concealment**: Question controllers explicitly sanitize documents returned to students during active tests, stripping `correctOptionIndex` and `explanation`.
- **Authoritative Server Timing**: All answer evaluation uses server clock timestamps (`Date.now()`). Client device clocks are untrusted.
- **Strict Deadline Guard**: Submissions timestamped after the server deadline are rejected.

## 3. Idempotency & Concurrency Safety
- **MongoDB Compound Unique Indexes**:
  - `Participant`: `{ quizId: 1, email: 1 }` prevents double registration.
  - `Answer`: `{ quizId: 1, participantId: 1, questionId: 1 }` prevents double submissions or re-scoring.
- Duplicate requests return previous confirmed results without mutating candidate scores.

## 4. Injection & Abuse Protection
- **NoSQL Injection**: Express JSON parsing coupled with strict Zod validation schemas sanitizes all incoming payloads.
- **CSV Formula Injection**: All exported spreadsheet fields are scanned for formula triggers (`=`, `+`, `-`, `@`) and prepended with single quotes (`'`) to disable macro execution in Microsoft Excel.
- **CORS & Helmet**: Production HTTP security headers via Helmet with configurable cross-origin resource sharing.
