const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER || 'manideepgonugunta2005@gmail.com',
        pass: process.env.SMTP_PASS || 'sxpbzvbyiphxljph'
    },
    debug: true,
    logger: true
});

// Standalone serverless function
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', '*');

    // Handle preflight request
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

        console.log('📧 Starting test email process...');
        console.log('Email Configuration:', {
            user: process.env.SMTP_USER || 'manideepgonugunta2005@gmail.com',
            host: 'smtp.gmail.com',
            port: 465,
            secure: true
        });

        const testMailOptions = {
            from: {
                name: 'FitWit AI',
                address: process.env.SMTP_USER || 'manideepgonugunta2005@gmail.com'
            },
            to: process.env.SMTP_USER || 'manideepgonugunta2005@gmail.com',
            subject: 'Test Email from FitWit AI',
            text: 'This is a test email from FitWit AI application.',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h1 style="color: #4ecdc4;">Test Email</h1>
                    <p>This is a test email from FitWit AI application.</p>
                    <p>If you receive this, the email service is working correctly!</p>
                    <p>Time sent: ${new Date().toLocaleString()}</p>
                    <p>Environment: ${process.env.NODE_ENV}</p>
                    <p>SMTP User: ${process.env.SMTP_USER || 'manideepgonugunta2005@gmail.com'}</p>
                </div>
            `
        };

        console.log('📧 Sending test email...');
        const info = await transporter.sendMail(testMailOptions);
        console.log('✅ Test email sent successfully:', info.messageId);
        console.log('📬 Preview URL:', nodemailer.getTestMessageUrl(info));
        res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('❌ Test email error:', error);
        console.error('Error details:', {
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode
        });
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.response || 'No additional details'
        });
    }
} 