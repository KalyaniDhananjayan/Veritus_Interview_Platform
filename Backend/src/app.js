const express = require('express');
const app = express();

app.use(express.json());

const sessionRoutes = require('./routes/session.routes');
app.use('/api/session', sessionRoutes);

module.exports = app;
