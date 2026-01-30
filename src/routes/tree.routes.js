const express = require('express');
const { create, listUserTrees, getDetails } = require('../controllers/tree.controller');
const authenticateToken = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateToken); // Protect all tree routes

router.post('/create', create);
router.get('/user', listUserTrees);
router.get('/:treeId', getDetails);

module.exports = router;
