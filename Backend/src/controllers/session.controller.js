const pool = require('../config/db');
const { evaluateDescriptive } = require('../services/ai.service');

exports.startSession = async (req, res) => {
  try {
    const { userId, domainId, testType, difficulty } = req.body || {};

    if (!userId || !testType || !difficulty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // 1. Create session
    const normalizedType = testType.toUpperCase();
    const normalizedDifficulty = difficulty ? difficulty.toUpperCase() : null;

    const validTypes = ['APTITUDE', 'CORE_CS', 'CODING_DSA', 'TECHNICAL', 'HR'];
    if (!validTypes.includes(normalizedType)) {
      return res.status(400).json({ error: 'Invalid test type' });
    }

    const nowUtc = new Date().toISOString();

    const sessionResult = await pool.query(
      `INSERT INTO sessions 
      (user_id, domain_id, test_type, difficulty, started_at, status)
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
      RETURNING *`,
      [userId, domainId, normalizedType, normalizedDifficulty, nowUtc]
    );

    const session = sessionResult.rows[0];

    // 2. Fetch random questions ONCE
    let query;
    let params;

    if (['APTITUDE','CORE_CS','CODING_DSA'].includes(normalizedType)) {
      query = `
        SELECT id FROM questions
        WHERE test_type = $1 AND difficulty = $2
        ORDER BY RANDOM()
        LIMIT 10
      `;
      params = [normalizedType, normalizedDifficulty];
    } else {
      query = `
        SELECT id FROM questions
        WHERE domain_id = $1 AND test_type = $2 AND difficulty = $3
        ORDER BY RANDOM()
        LIMIT 10
      `;
      params = [domainId, normalizedType, normalizedDifficulty];
    }

    const questionsResult = await pool.query(query, params);
    const questions = questionsResult.rows;

    if (questions.length === 0) {
      return res.status(400).json({ error: 'No questions found for this configuration' });
    }

    // 3. Store question order in session_questions
    const insertPromises = questions.map((q, index) => {
      return pool.query(
        `INSERT INTO session_questions (session_id, question_id, order_index)
         VALUES ($1, $2, $3)`,
        [session.id, q.id, index]
      );
    });

    await Promise.all(insertPromises);

    // 4. Log event
    await pool.query(
      `INSERT INTO session_events (session_id, event_type)
       VALUES ($1, $2)`,
      [session.id, 'started']
    );

    res.status(201).json({
      message: 'Session started',
      sessionId: session.id
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start session' });
  }
};


exports.getCurrentQuestion = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const sessionResult = await pool.query(
      `SELECT * FROM sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];


    if (session.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Session not active' });
    }

    const questionsResult = await pool.query(
      `SELECT q.id, q.question_text, q.question_format, q.options
       FROM session_questions sq
       JOIN questions q ON q.id = sq.question_id
       WHERE sq.session_id = $1
       ORDER BY sq.order_index ASC`,
      [sessionId]
    );

    const questions = questionsResult.rows;
    const currentIndex = session.current_index;

    if (currentIndex >= questions.length) {
      return res.json({ message: 'Session completed' });
    }

    const currentQuestion = questions[currentIndex];

    res.json({
      sessionId: session.id,
      questionIndex: currentIndex,
      totalQuestions: questions.length,
      question: {
        id: currentQuestion.id,
        text: currentQuestion.question_text,
        format: currentQuestion.question_format,
        options: currentQuestion.options || null
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get question' });
  }
};

exports.submitAnswer = async (req, res) => {
  const { sessionId, questionId, answer } = req.body;

  try {
    const sessionResult = await pool.query(
      `SELECT * FROM sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Session not active' });
    }

    const questionsResult = await pool.query(
      `SELECT question_id
       FROM session_questions
       WHERE session_id = $1
       ORDER BY order_index ASC`,
      [sessionId]
    );

    const questions = questionsResult.rows;
    const expectedQuestion = questions[session.current_index];

    if (!expectedQuestion || expectedQuestion.question_id !== questionId) {
      return res.status(400).json({ error: 'Invalid question order' });
    }

    const questionDetails = await pool.query(
      `SELECT question_format, correct_option
       FROM questions WHERE id = $1`,
      [questionId]
    );

    const question = questionDetails.rows[0];

    let score = null;
    let evaluationStatus = 'COMPLETED';

    if (question.question_format === 'MCQ') {
      score = parseInt(answer) === question.correct_option ? 1 : 0;
    } else {
      evaluationStatus = 'PENDING';
    }

    const insertResult = await pool.query(
      `INSERT INTO responses
       (session_id, question_id, answer_text, score, evaluation_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [sessionId, questionId, answer, score, evaluationStatus]
    );

    const responseId = insertResult.rows[0].id;

    if (question.question_format === 'DESCRIPTIVE') {
      triggerAIEvaluation(responseId, questionId, answer);
    }

    await pool.query(
      `INSERT INTO session_events (session_id, event_type, metadata)
       VALUES ($1, $2, $3)`,
      [sessionId, 'submitted', JSON.stringify({ questionId })]
    );

    const newIndex = session.current_index + 1;

    await pool.query(
      `UPDATE sessions SET current_index = $1 WHERE id = $2`,
      [newIndex, sessionId]
    );

    if (newIndex >= questions.length) {
      await pool.query(
        `UPDATE sessions SET status = 'COMPLETED', ended_at = $1 WHERE id = $2`,
        [new Date().toISOString(), sessionId]
      );

      await pool.query(
        `INSERT INTO session_events (session_id, event_type) VALUES ($1, $2)`,
        [sessionId, 'completed']
      );

      return res.json({ message: 'Session completed', forceTerminate: true });
    }

    const nextQuestionResult = await pool.query(
      `SELECT q.id, q.question_text, q.question_format, q.options
       FROM session_questions sq
       JOIN questions q ON q.id = sq.question_id
       WHERE sq.session_id = $1 AND sq.order_index = $2`,
      [sessionId, newIndex]
    );

    const nextQuestion = nextQuestionResult.rows[0];

    res.json({
      message: 'Answer recorded',
      nextQuestionIndex: newIndex,
      totalQuestions: questions.length,
      nextQuestion: {
        id: nextQuestion.id,
        text: nextQuestion.question_text,
        format: nextQuestion.question_format,
        options: nextQuestion.options || null
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
};



exports.getSessionResult = async (req, res) => {
  const { sessionId } = req.params;

  try {
    // 1. Get session
    const sessionResult = await pool.query(
      `SELECT * FROM sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // 2. Get total questions for session
    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM session_questions WHERE session_id = $1`,
      [sessionId]
    );

    const totalQuestions = parseInt(totalResult.rows[0].count);

    // 3. Get responses with full details (score, feedback, question info)
    const responseResult = await pool.query(
      `SELECT r.id, r.question_id, r.answer_text, r.score, r.feedback,
              r.evaluation_status, q.question_text, q.question_format,
              q.options, q.correct_option
       FROM responses r
       JOIN questions q ON q.id = r.question_id
       WHERE r.session_id = $1
       ORDER BY r.id ASC`,
      [sessionId]
    );

    const responses = responseResult.rows;
    const answered = responses.length;
    const unanswered = totalQuestions - answered;

    // 4. Check if any evaluations are still pending
    const pendingCount = responses.filter(r => r.evaluation_status === 'PENDING').length;
    const failedCount  = responses.filter(r => r.evaluation_status === 'FAILED').length;

    // 5. Normalize all scores to a 0–10 scale
    //    MCQ scores are stored as 0 or 1 → multiply by 10
    //    Descriptive scores are already 0–10
    const normalizedResponses = responses.map(r => {
      let normalizedScore = null;

      if (r.score !== null) {
        const raw = parseFloat(r.score);
        if (r.question_format === 'MCQ') {
          normalizedScore = raw * 10; // 0→0, 1→10
        } else {
          normalizedScore = raw; // already 0-10
        }
      }

      // For MCQ: resolve option index → option text
      let answerFields = {};
      if (r.question_format === 'MCQ') {
        const opts = r.options || [];
        const selectedIdx = parseInt(r.answer_text);
        const correctIdx  = r.correct_option;
        answerFields = {
          yourAnswerIndex: isNaN(selectedIdx) ? null : selectedIdx,
          yourAnswer:      opts[selectedIdx]  ?? r.answer_text,
          correctAnswer:   opts[correctIdx]   ?? null,
          isCorrect:       selectedIdx === correctIdx
        };
      } else {
        answerFields = { yourAnswer: r.answer_text };
      }

      return {
        questionId:       r.question_id,
        questionText:     r.question_text,
        questionFormat:   r.question_format,
        ...answerFields,
        score:            normalizedScore,        // out of 10
        feedback:         r.feedback || (r.evaluation_status === 'PENDING'
                            ? 'Evaluation in progress…'
                            : r.evaluation_status === 'FAILED'
                              ? 'Evaluation failed — score defaulted.'
                              : null),
        evaluationStatus: r.evaluation_status
      };
    });

    // 6. Compute aggregate stats over normalized (0-10) scores
    const scoredResponses = normalizedResponses.filter(r => r.score !== null);
    const totalPossibleScore = totalQuestions * 10;           // max = 100 when 10 questions
    const totalAchievedScore = scoredResponses.reduce((a, r) => a + (r.score || 0), 0);
    const averageScore       = scoredResponses.length > 0
      ? parseFloat((totalAchievedScore / scoredResponses.length).toFixed(2))
      : null;
    const percentage = parseFloat(((totalAchievedScore / totalPossibleScore) * 100).toFixed(2));

    res.json({
      sessionId:          session.id,
      status:             session.status,
      testType:           session.test_type,
      difficulty:         session.difficulty,
      totalQuestions,
      answered,
      unanswered,
      pendingEvaluations: pendingCount,
      failedEvaluations:  failedCount,
      averageScore,                                 // out of 10
      totalScore:         parseFloat(totalAchievedScore.toFixed(2)),
      totalPossibleScore,
      percentage,                                   // 0–100
      startedAt:          session.started_at,
      endedAt:            session.ended_at,
      responses:          normalizedResponses
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
};

exports.getUserSessions = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT s.id, s.status, s.test_type, s.difficulty,
              s.started_at, s.ended_at,
              d.name AS domain
       FROM sessions s
       LEFT JOIN domains d ON s.domain_id = d.id
       WHERE s.user_id = $1
       ORDER BY s.started_at DESC`,
      [userId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};


async function triggerAIEvaluation(responseId, questionId, answer) {
    try {
        const questionData = await pool.query(
          `SELECT question_text, test_type, difficulty 
           FROM questions WHERE id = $1`,
          [questionId]
        );

        const payload = {
            question: questionData.rows[0].question_text,
            answer: answer,
            testType: questionData.rows[0].test_type,
            difficulty: questionData.rows[0].difficulty
        };

        const result = await evaluateDescriptive(payload);

        await pool.query(
          `UPDATE responses
           SET score = $1,
               feedback = $2,
               evaluation_status = 'COMPLETED'
           WHERE id = $3`,
          [result.score, result.feedback, responseId]
        );

    } catch (err) {
        console.error("AI evaluation failed:", err.message);

        // Store failure reason as feedback so the result API can surface it
        await pool.query(
          `UPDATE responses
           SET evaluation_status = 'FAILED',
               feedback = $1
           WHERE id = $2`,
          [err.message || 'AI evaluation service unavailable.', responseId]
        );
    }
}