module.exports = (req, res) => {
    res.json({
        message: 'Test API endpoint working',
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.url
    });
}; 