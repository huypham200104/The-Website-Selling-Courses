const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { chatWithDbAssistant } = require('../controllers/chatController');

router.post('/', auth, roleCheck('student'), chatWithDbAssistant);

module.exports = router;
