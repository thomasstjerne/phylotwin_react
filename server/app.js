const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const runsRouter = require('./routes/runs');
const jobsRouter = require('./routes/jobs');
const authRouter = require('./routes/auth');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://your-production-domain.com' 
        : 'http://localhost:3000',
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/phylonext/runs', runsRouter);
app.use('/myruns', runsRouter);
app.use('/job', runsRouter);
app.use('/api/phylonext/jobs', jobsRouter);

// Auth routes
app.use('/auth', authRouter);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start server
const port = config.EXPRESS_PORT || 9000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Config:', {
        outputPath: config.OUTPUT_PATH,
        nextflowPath: config.NEXTFLOW
    });
}); 