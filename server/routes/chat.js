const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  getPartners,
  getMessages,
  sendMessage,
} = require('../controllers/chatController');
const { studentAssistantChat } = require('../controllers/aiChatController');

router.use(auth);
router.use(roleCheck('instructor', 'student'));

router.post('/', studentAssistantChat);
router.get('/partners', getPartners);
router.get('/messages/:partnerId', getMessages);
router.post('/messages/:partnerId', sendMessage);

module.exports = router;
