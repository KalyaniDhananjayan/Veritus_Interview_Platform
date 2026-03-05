const pool = require('../config/db');
const { evaluateDescriptive } = require('../services/ai.service');
const TIME_LIMITS = {
  APTITUDE: 1800,      // 30 min
  CORE_CS: 1800,      // 30 min
  CODING_DSA: 1800,   // 30 min
  TECHNICAL: 3600,    // 60 min
  HR: 2700           // 45 min
};

exports.startSession = async (req, res) => {
  try {
    const { userId, domainId, testType, difficulty } = req.body || {};

    if (!userId || !testType || !difficulty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // 1. Create session
    const normalizedType = testType.toUpperCase();
    const timeLimit = TIME_LIMITS[normalizedType];
    const normalizedDifficulty = difficulty ? difficulty.toUpperCase() : null;

    if (!timeLimit) {
      return res.status(400).json({ error: "Invalid test type" });
    }

    const startedAt = new Date();

    const sessionResult = await pool.query(
      `INSERT INTO sessions 
      (user_id, domain_id, test_type, difficulty, time_limit, started_at, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
      RETURNING *`,
      [userId, domainId, normalizedType , normalizedDifficulty, timeLimit, startedAt]
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

    // 🔴 Expiry check FIRST
    if (isSessionExpired(session)) {
      await pool.query(
        `UPDATE sessions
         SET status = 'EXPIRED', ended_at = NOW()
         WHERE id = $1`,
        [session.id]
      );

      await pool.query(
        `INSERT INTO session_events (session_id, event_type)
         VALUES ($1, $2)`,
        [session.id, 'expired']
      );

      return res.status(400).json({
        error: 'Session expired',
        forceTerminate: true
      });
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

    const now = new Date();
    const start = new Date(session.started_at);
    const elapsed = (now - start) / 1000;
    const remaining = Math.max(session.time_limit - elapsed, 0);

    res.json({
      sessionId: session.id,
      questionIndex: currentIndex,
      question: {
        id: currentQuestion.id,
        text: currentQuestion.question_text,
        format: currentQuestion.question_format,
        options: currentQuestion.options || null
      },
      timeRemaining: Math.floor(remaining)
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

    // 🔴 Expiry check FIRST (before any heavy queries)
    if (isSessionExpired(session)) {
      await pool.query(
        `UPDATE sessions
         SET status = 'EXPIRED', ended_at = NOW()
         WHERE id = $1`,
        [session.id]
      );

      await pool.query(
        `INSERT INTO session_events (session_id, event_type)
         VALUES ($1, $2)`,
        [session.id, 'expired']
      );

      return res.status(400).json({
        error: 'Session expired',
        forceTerminate: true
      });
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
      `UPDATE sessions
       SET current_index = $1
       WHERE id = $2`,
      [newIndex, sessionId]
    );

    if (newIndex >= questions.length) {
      await pool.query(
        `UPDATE sessions
         SET status = 'COMPLETED', ended_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );

      await pool.query(
        `INSERT INTO session_events (session_id, event_type)
         VALUES ($1, $2)`,
        [sessionId, 'completed']
      );

      return res.json({
        message: 'Session completed',
        forceTerminate: true
      });
    }

    const nextQuestionResult = await pool.query(
      `SELECT q.id, q.question_text, q.question_format, q.options
       FROM session_questions sq
       JOIN questions q ON q.id = sq.question_id
       WHERE sq.session_id = $1 AND sq.order_index = $2`,
      [sessionId, newIndex]
    );

    const nextQuestion = nextQuestionResult.rows[0];

    const now = new Date();
    const start = new Date(session.started_at);
    const elapsed = (now - start) / 1000;
    const remaining = Math.max(session.time_limit - elapsed, 0);

    res.json({
      message: 'Answer recorded',
      nextQuestionIndex: newIndex,
      nextQuestion: {
        id: nextQuestion.id,
        text: nextQuestion.question_text,
        format: nextQuestion.question_format,
        options: nextQuestion.options || null
      },
      timeRemaining: Math.floor(remaining)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
};

function isSessionExpired(session) {
    const now = new Date();
    const start = new Date(session.started_at);
    const elapsedSeconds = (now - start) / 1000;

    return elapsedSeconds > session.time_limit;
}

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

    // 3. Get responses
    const responseResult = await pool.query(
      `SELECT score FROM responses WHERE session_id = $1`,
      [sessionId]
    );

    const responses = responseResult.rows;

    const answered = responses.length;
    const unanswered = totalQuestions - answered;

    const scores = responses
      .map(r => r.score)
      .filter(s => s !== null)
      .map(s => parseFloat(s));

    const sum = scores.reduce((a, b) => a + b, 0);

    const percentage = scores.length > 0 ? (sum / totalQuestions) * 100 : 0;

    const averageScore = scores.length > 0 ? sum / scores.length : null;

    res.json({
      sessionId: session.id,
      status: session.status,
      totalQuestions,
      answered,
      unanswered,
      averageScore,
      percentage: Math.round(percentage),
      startedAt: session.started_at,
      endedAt: session.ended_at
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

        await pool.query(
          `UPDATE responses
           SET evaluation_status = 'FAILED'
           WHERE id = $1`,
          [responseId]
        );
    }
}