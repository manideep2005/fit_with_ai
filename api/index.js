const app = require('../server');

// Error handling for serverless environment
app.use((err, req, res, next) => {
    console.error('Serverless Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Export the Express app as a serverless function
module.exports = app; 