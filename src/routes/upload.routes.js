const express = require('express');
const upload = require('../config/multer');
const { uploadMemberImage } = require('../controllers/upload.controller');
const authenticateToken = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/member-image', authenticateToken, upload.single('image'), uploadMemberImage);

module.exports = router;
