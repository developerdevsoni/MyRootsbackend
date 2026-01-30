const express = require('express');
const { add, get, remove } = require('../controllers/member.controller');
const authenticateToken = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateToken);

router.post('/add', add);
router.get('/:memberId', get);
router.delete('/:memberId', remove);

module.exports = router;
