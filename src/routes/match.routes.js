const express = require('express');
const { getMyMatches, getTreeMatches } = require('../controllers/match.controller');
const authenticateToken = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/my-matches', getMyMatches);
router.get('/tree/:treeId', getTreeMatches);

module.exports = router;
