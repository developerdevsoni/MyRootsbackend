const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');

const authRoutes = require('./routes/auth.routes');
const treeRoutes = require('./routes/tree.routes');
const memberRoutes = require('./routes/member.routes');
const matchRoutes = require('./routes/match.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger
const swaggerDocument = yaml.load(path.join(__dirname, '../swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tree', treeRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/upload', uploadRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

module.exports = app;
