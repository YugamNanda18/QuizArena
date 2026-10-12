import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Quiz } from '../models/Quiz';
import { Question } from '../models/Question';
import { Participant } from '../models/Participant';
import { Answer } from '../models/Answer';
import { LeaderboardService } from '../services/leaderboardService';
import { ScoringEngine } from '../services/scoringEngine';

async function runFluctuationTest() {
  console.log('====================================================');
  console.log('🚀 QUIZARENA ENTERPRISE: LIVE LEADERBOARD FLUCTUATION TEST');
  console.log('====================================================');

  await connectDB();

  const testRoomCode = 'FLUCT9';

  try {
    // 0. Clean any prior test debris if exists
    const existing = await Quiz.findOne({ roomCode: testRoomCode });
    if (existing) {
      await Question.deleteMany({ quizId: existing._id });
      await Participant.deleteMany({ quizId: existing._id });
      await Answer.deleteMany({ quizId: existing._id });
      await Quiz.deleteOne({ _id: existing._id });
    }

    // 1. Create Test Quiz
    const quiz = new Quiz({
      title: 'Temporary Leaderboard Fluctuation Test',
      slug: 'temp-leaderboard-fluct-test',
      roomCode: testRoomCode,
      status: 'LIVE',
      durationMinutes: 10,
      actualStartTime: new Date(),
      deadline: new Date(Date.now() + 10 * 60 * 1000),
      totalQuestions: 2,
      maxScore: 300,
      scoringSettings: {
        speedBonusEnabled: true,
        maxSpeedBonus: 20,
        negativeMarkingEnabled: false,
      },
    });
    await quiz.save();
    console.log(`✅ [1/5] Created test quiz: "${quiz.title}" (Room: ${quiz.roomCode})`);

    // 2. Create 2 Questions
    const q1 = new Question({
      quizId: quiz._id,
      text: 'What is the speed of light?',
      options: ['299,792 km/s', '150,000 km/s', '1,080 km/s', '3,000 km/s'],
      correctOptionIndex: 0,
      points: 100,
      order: 1,
    });
    const q2 = new Question({
      quizId: quiz._id,
      text: 'Which data structure uses LIFO ordering?',
      options: ['Queue', 'Stack', 'Array', 'Tree'],
      correctOptionIndex: 1,
      points: 200,
      order: 2,
    });
    await q1.save();
    await q2.save();
    console.log(`✅ [2/5] Created 2 assessment questions (100 pts & 200 pts)`);

    // 3. Register 3 Candidates: Alice, Bob, Charlie
    const alice = new Participant({
      quizId: quiz._id,
      name: 'Alice Demo',
      email: 'alice.fluct@demo.internal',
      status: 'IN_PROGRESS',
      registeredAt: new Date(Date.now() - 3000),
    });
    const bob = new Participant({
      quizId: quiz._id,
      name: 'Bob Demo',
      email: 'bob.fluct@demo.internal',
      status: 'IN_PROGRESS',
      registeredAt: new Date(Date.now() - 2000),
    });
    const charlie = new Participant({
      quizId: quiz._id,
      name: 'Charlie Demo',
      email: 'charlie.fluct@demo.internal',
      status: 'IN_PROGRESS',
      registeredAt: new Date(Date.now() - 1000),
    });
    await alice.save();
    await bob.save();
    await charlie.save();
    console.log(`✅ [3/5] Registered 3 dummy candidates: Alice, Bob, Charlie`);

    // ----------------------------------------------------
    // ROUND 1: Alice answers Question 1 correctly in 5000ms
    // ----------------------------------------------------
    console.log('\n--- Round 1: Alice submits Question 1 (100 pts) ---');
    const aliceAnsTime = new Date(Date.now() - 500000);
    const aliceEval = ScoringEngine.evaluateAnswer(quiz, q1, 0, new Date(aliceAnsTime.getTime() + 5000), aliceAnsTime);
    alice.baseScore += aliceEval.basePoints;
    alice.bonusScore += aliceEval.speedBonus;
    alice.totalScore += aliceEval.pointsAwarded;
    alice.correctCount += 1;
    alice.cumulativeResponseTimeMs += 5000;
    await alice.save();

    let lb1 = await LeaderboardService.getAndRecomputeLeaderboard(quiz._id.toString());
    console.log('Leaderboard after Alice answers:');
    lb1.forEach((e) => console.log(`  Rank #${e.rank}: ${e.name} — Score: ${e.totalScore} (Movement: ${e.movement})`));

    if (lb1[0].name !== 'Alice Demo' || lb1[0].rank !== 1) {
      throw new Error(`Round 1 Failed: Expected Alice to be Rank #1, got ${lb1[0].name}`);
    }

    // ----------------------------------------------------
    // ROUND 2: Bob answers Question 1 faster in 1000ms (Receives speed bonus)
    // ----------------------------------------------------
    console.log('\n--- Round 2: Bob submits Question 1 faster (Higher speed bonus) ---');
    const bobAnsTime = new Date(Date.now() - 500000);
    const bobEval = ScoringEngine.evaluateAnswer(quiz, q1, 0, new Date(bobAnsTime.getTime() + 1000), bobAnsTime);
    bob.baseScore += bobEval.basePoints;
    bob.bonusScore += bobEval.speedBonus;
    bob.totalScore += bobEval.pointsAwarded;
    bob.correctCount += 1;
    bob.cumulativeResponseTimeMs += 1000;
    await bob.save();

    let lb2 = await LeaderboardService.getAndRecomputeLeaderboard(quiz._id.toString());
    console.log('Leaderboard after Bob answers:');
    lb2.forEach((e) => console.log(`  Rank #${e.rank}: ${e.name} — Score: ${e.totalScore} (Movement: ${e.movement})`));

    const bobEntry = lb2.find((e) => e.name === 'Bob Demo');
    const aliceEntry = lb2.find((e) => e.name === 'Alice Demo');

    if (bobEntry?.rank !== 1) {
      throw new Error(`Round 2 Failed: Bob should overtake Alice to Rank #1 due to speed bonus`);
    }
    if (aliceEntry?.rank !== 2) {
      throw new Error(`Round 2 Failed: Alice should drop to Rank #2`);
    }
    console.log(`🎯 Real-Time Fluctuation Verified: Bob took Rank #1, Alice dropped from #1 to #2!`);

    // ----------------------------------------------------
    // ROUND 3: Charlie answers Question 1 AND Question 2 (300 pts)
    // ----------------------------------------------------
    console.log('\n--- Round 3: Charlie answers both Q1 and Q2 (300 pts total) ---');
    const cAns1 = ScoringEngine.evaluateAnswer(quiz, q1, 0, new Date(), new Date(Date.now() - 2000));
    const cAns2 = ScoringEngine.evaluateAnswer(quiz, q2, 1, new Date(), new Date(Date.now() - 2000));
    charlie.baseScore += (cAns1.basePoints + cAns2.basePoints);
    charlie.bonusScore += (cAns1.speedBonus + cAns2.speedBonus);
    charlie.totalScore += (cAns1.pointsAwarded + cAns2.pointsAwarded);
    charlie.correctCount += 2;
    charlie.cumulativeResponseTimeMs += 4000;
    await charlie.save();

    let lb3 = await LeaderboardService.getAndRecomputeLeaderboard(quiz._id.toString());
    console.log('Leaderboard after Charlie answers:');
    lb3.forEach((e) => console.log(`  Rank #${e.rank}: ${e.name} — Score: ${e.totalScore} (Movement: ${e.movement})`));

    const charlieFinal = lb3.find((e) => e.name === 'Charlie Demo');
    const bobFinal = lb3.find((e) => e.name === 'Bob Demo');
    const aliceFinal = lb3.find((e) => e.name === 'Alice Demo');

    if (charlieFinal?.rank !== 1) {
      throw new Error(`Round 3 Failed: Charlie should be Rank #1 with highest score`);
    }
    if (bobFinal?.rank !== 2) {
      throw new Error(`Round 3 Failed: Bob should be Rank #2`);
    }
    if (aliceFinal?.rank !== 3) {
      throw new Error(`Round 3 Failed: Alice should be Rank #3`);
    }
    console.log(`🎯 Second Fluctuation Verified: Charlie jumped to #1, Bob dropped to #2, Alice dropped to #3!`);

    // ----------------------------------------------------
    // 4. CLEANUP: Delete all dummy demo test data completely
    // ----------------------------------------------------
    console.log('\n--- Cleanup: Purging all dummy test data ---');
    await Question.deleteMany({ quizId: quiz._id });
    await Participant.deleteMany({ quizId: quiz._id });
    await Answer.deleteMany({ quizId: quiz._id });
    await Quiz.deleteOne({ _id: quiz._id });
    console.log(`🧹 Fully deleted temporary quiz, participants, and questions. Zero junk remaining in database.`);

    console.log('\n====================================================');
    console.log('🏆 ALL LIVE LEADERBOARD FLUCTUATION TESTS PASSED 100%!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Fluctuation Test Error:', err);
    throw err;
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected cleanly.');
  }
}

runFluctuationTest().catch(() => process.exit(1));
