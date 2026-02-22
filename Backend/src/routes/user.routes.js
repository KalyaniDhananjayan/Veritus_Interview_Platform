const express = require('express');
const router = express.Router();
const { getUserSessions } = require('../controllers/session.controller');

router.get('/:userId/sessions', getUserSessions);

module.exports = router;