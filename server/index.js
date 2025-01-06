const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const { v4: uuidv4 } = require('uuid');
const auth = require('./Auth/auth');

// Create Express app
const app = express();

// Custom request ID middleware
const addRequestId = (req, res, next) => {
  req.id = uuidv4();
  next();
};

// Middleware
app.use(cors());
app.use(addRequestId);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', auth.router);
app.use('/api/phylonext/jobs', require('./routes/jobs'));
app.use('/api/phylonext', require('./routes/runs'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Start server
const port = config.EXPRESS_PORT || 9000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
}); 