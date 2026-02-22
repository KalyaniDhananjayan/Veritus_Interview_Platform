const express = require('express');
const app = express();

app.use(express.json());

const sessionRoutes = require('./routes/session.routes');
const userRoutes = require('./routes/user.routes');

app.use('/api/users', userRoutes);
app.use('/api/session', sessionRoutes);

module.exports = app;
