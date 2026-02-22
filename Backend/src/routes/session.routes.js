const express = require('express');
const router = express.Router();
const {
  startSession, 
  getSessionResult,
  getCurrentQuestion,
  submitAnswer,
  getUserSessions
} = require('../controllers/session.controller');

router.post('/start', startSession);
router.get('/:sessionId/question', getCurrentQuestion);
router.post('/answer', submitAnswer);
router.get('/:sessionId/result', getSessionResult);
router.get('/user/:userId', getUserSessions);

module.exports = router;
