const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const sessionRoutes = require('./routes/session.routes');
const userRoutes = require('./routes/user.routes');

app.use('/api/users', userRoutes);
app.use('/api/session', sessionRoutes);

// lightweight health check
app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

module.exports = app;
