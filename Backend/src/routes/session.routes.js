const express = require('express');
const router = express.Router();
const {
  startSession,
  getCurrentQuestion,
  submitAnswer
} = require('../controllers/session.controller');

router.post('/start', startSession);
router.get('/:sessionId/question', getCurrentQuestion);
router.post('/answer', submitAnswer);

module.exports = router;
