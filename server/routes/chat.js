const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  getPartners,
  getMessages,
  sendMessage,
} = require('../controllers/chatController');

router.use(auth);
router.use(roleCheck('instructor', 'student'));

router.get('/partners', getPartners);
router.get('/messages/:partnerId', getMessages);
router.post('/messages/:partnerId', sendMessage);

module.exports = router;
