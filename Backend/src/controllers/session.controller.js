const pool = require('../config/db');

exports.startSession = async (req, res) => {
  const { userId, domainId, testType, difficulty } = req.body;

  try {
    // 1. Create session
    const sessionResult = await pool.query(
      `INSERT INTO sessions (user_id, domain_id, test_type, difficulty, time_limit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, domainId, testType, difficulty, 1800]
    );

    const session = sessionResult.rows[0];

    // 2. Fetch random questions ONCE
    let query;
    let params;

    if (testType === 'APTITUDE' || testType === 'CODING') {
      query = `
        SELECT id FROM questions
        WHERE test_type = $1 AND difficulty = $2
        ORDER BY RANDOM()
        LIMIT 10
      `;
      params = [testType, difficulty];
    } else {
      query = `
        SELECT id FROM questions
        WHERE domain_id = $1 AND test_type = $2 AND difficulty = $3
        ORDER BY RANDOM()
        LIMIT 10
      `;
      params = [domainId, testType, difficulty];
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
    // 1. Get session
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

    // 2. Get ordered questions for this session
    const questionsResult = await pool.query(
      `SELECT q.id, q.question_text
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
      question: currentQuestion
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get question' });
  }
};

exports.submitAnswer = async (req, res) => {
  const { sessionId, questionId, answer } = req.body;

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

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Session not active' });
    }

    // 2. Get ordered questions for session
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

    // 3. Store response
    await pool.query(
      `INSERT INTO responses (session_id, question_id, answer_text, evaluation_status)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, questionId, answer, 'COMPLETED']
    );

    // 4. Log event
    await pool.query(
      `INSERT INTO session_events (session_id, event_type, metadata)
       VALUES ($1, $2, $3)`,
      [sessionId, 'submitted', JSON.stringify({ questionId })]
    );

    // 5. Advance index
    const newIndex = session.current_index + 1;

    await pool.query(
      `UPDATE sessions SET current_index = $1 WHERE id = $2`,
      [newIndex, sessionId]
    );

    // 6. Check if completed
    if (newIndex >= questions.length) {
      await pool.query(
        `UPDATE sessions SET status = 'COMPLETED', ended_at = NOW() WHERE id = $1`,
        [sessionId]
      );

      await pool.query(
        `INSERT INTO session_events (session_id, event_type)
         VALUES ($1, $2)`,
        [sessionId, 'completed']
      );

      return res.json({ message: 'Session completed' });
    }

    // 7. Return next question
    const nextQuestionResult = await pool.query(
      `SELECT q.id, q.question_text
       FROM session_questions sq
       JOIN questions q ON q.id = sq.question_id
       WHERE sq.session_id = $1 AND sq.order_index = $2`,
      [sessionId, newIndex]
    );

    const nextQuestion = nextQuestionResult.rows[0];

    res.json({
      message: 'Answer recorded',
      nextQuestionIndex: newIndex,
      nextQuestion
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
};
