const pool = require('../config/db');
const { evaluateDescriptive } = require('../services/ai.service');


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
    const questionDetails = await pool.query(
      `SELECT question_format, correct_option FROM questions WHERE id = $1`,
      [questionId]
    );

    const question = questionDetails.rows[0];
    const questions = questionsResult.rows;

    const expectedQuestion = questions[session.current_index];

    if (!expectedQuestion || expectedQuestion.question_id !== questionId) {
      return res.status(400).json({ error: 'Invalid question order' });
    }

    //evaluation logic - for MCQs we can auto-evaluate, for others we can set score as null and evaluate later
    let score = null;
    let evaluationStatus = 'COMPLETED';

    if (question.question_format === 'MCQ') {
        score = parseInt(answer) === question.correct_option ? 1 : 0;
        evaluationStatus = 'COMPLETED';
    } else {
        evaluationStatus = 'PENDING';
    }


    // 3. Store response
    await pool.query(
      `INSERT INTO responses 
      (session_id, question_id, answer_text, score, evaluation_status)
      VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, questionId, answer, score, evaluationStatus]
    );

    if (question.question_format === 'DESCRIPTIVE') {
        triggerAIEvaluation(responseId, questionId, answer);
    }

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

    const scores = responses
      .map(r => r.score)
      .filter(s => s !== null);

    const averageScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + parseFloat(b), 0) / scores.length
        : null;

    res.json({
      sessionId: session.id,
      status: session.status,
      totalQuestions,
      answered,
      averageScore,
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
          `SELECT question_text, test_type, difficulty FROM questions WHERE id = $1`,
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
               evaluation_status = 'COMPLETED',
               feedback = $2
           WHERE id = $3`,
          [result.score, result.feedback, responseId]
        );

    } catch (err) {
        await pool.query(
          `UPDATE responses
           SET evaluation_status = 'FAILED'
           WHERE id = $1`,
          [responseId]
        );
    }
}