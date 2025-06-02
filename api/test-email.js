const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Standalone serverless function
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return res.status(500).json({
                success: false,
                error: 'SMTP credentials not configured',
                smtp_user_set: !!process.env.SMTP_USER,
                smtp_pass_set: !!process.env.SMTP_PASS
            });
        }

        const testMailOptions = {
            from: {
                name: 'FitWit AI',
                address: process.env.SMTP_USER
            },
            to: process.env.SMTP_USER,
            subject: 'Test Email from FitWit AI',
            text: 'This is a test email from FitWit AI application.',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h1 style="color: #4ecdc4;">Test Email</h1>
                    <p>This is a test email from FitWit AI application.</p>
                    <p>If you receive this, the email service is working correctly!</p>
                    <p>Time sent: ${new Date().toLocaleString()}</p>
                    <p>Environment: ${process.env.NODE_ENV}</p>
                    <p>SMTP User: ${process.env.SMTP_USER}</p>
                </div>
            `
        };

        const info = await transporter.sendMail(testMailOptions);
        console.log('Test email sent successfully:', info.messageId);
        res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.response || 'No additional details'
        });
    }
} 