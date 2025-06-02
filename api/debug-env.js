module.exports = (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    res.json({
        environment: process.env.NODE_ENV,
        smtp_user_set: !!process.env.SMTP_USER,
        smtp_pass_set: !!process.env.SMTP_PASS,
        session_secret_set: !!process.env.SESSION_SECRET,
        port_set: !!process.env.PORT,
        smtp_user_correct: process.env.SMTP_USER === 'manideepgonugunta2005@gmail.com',
        port_value: process.env.PORT || 3000,
        app_url: process.env.APP_URL,
        base_url: process.env.BASE_URL
    });
}; 