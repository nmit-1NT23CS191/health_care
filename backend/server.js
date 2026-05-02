const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./utils/db');

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/claims', require('./routes/claims'));
app.use('/ai', require('./routes/ai'));
app.use('/agent', require('./routes/agent'));
app.use('/payment', require('./routes/payment'));

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Prevent server crash on unhandled errors (e.g. Tesseract worker crashes)
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
    // Note: in a production environment, you might want to gracefully shutdown and restart
});
