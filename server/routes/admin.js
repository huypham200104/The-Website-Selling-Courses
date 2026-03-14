const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth);
router.use(roleCheck('admin'));

router.get('/stats', getStats);

module.exports = router;
