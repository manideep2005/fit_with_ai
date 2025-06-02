const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter object using Gmail SMTP
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

// Verify connection configuration with retries
const verifyConnection = async () => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ Using default email credentials as environment variables are not set');
    }

    console.log('🔍 Verifying SMTP connection...');
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await createTransporter().verify();
            console.log('✅ SMTP connection verified and ready');
            return true;
        } catch (error) {
            console.error(`❌ SMTP connection error (attempt ${attempt}/${maxRetries}):`, error);
            if (attempt < maxRetries) {
                const delay = attempt * 1000;
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    console.error('❌ Failed to verify SMTP connection after all retries');
    return false;
};

// Initialize email configuration
(async () => {
    const isConnected = await verifyConnection();
    if (!isConnected) {
        console.error('❌ Email service is not properly configured. Some features may not work.');
    }
})();

const sendWelcomeEmail = async (userEmail, userName) => {
    console.log('Starting welcome email send process for:', userEmail);
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const transporter = createTransporter();
            const mailOptions = {
                from: {
                    name: 'FitWit AI',
                    address: process.env.SMTP_USER
                },
                to: userEmail,
                subject: '🏋️‍♂️ Welcome to Fit With AI - Your Personal Fitness Journey Begins!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background-color: #4ecdc4; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0;">Welcome to FitWit AI!</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your personal fitness journey begins here</p>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                            <h2 style="color: #4ecdc4; margin-top: 0;">Hello ${userName},</h2>
                            <p>Welcome to Fit With AI! We're excited to help you achieve your fitness goals.</p>
                            
                            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                <h3 style="color: #4ecdc4; margin-top: 0;">What's Next?</h3>
                                <ul style="padding-left: 20px; line-height: 1.6;">
                                    <li>Complete your fitness assessment</li>
                                    <li>Get your personalized workout plan</li>
                                    <li>Track your progress</li>
                                    <li>Connect with fitness experts</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px; color: #6c757d;">
                            <p style="margin: 5px 0;">Thank you for choosing Fit With AI!</p>
                            <small style="opacity: 0.7;">© ${new Date().getFullYear()} Fit With AI. All rights reserved.</small>
                        </div>
                    </div>
                `
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Welcome email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed:`, error);
            lastError = error;
            
            if (attempt < maxRetries) {
                const delay = attempt * 1000;
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw new Error(`Failed to send welcome email after ${maxRetries} attempts. Last error: ${lastError.message}`);
};

const sendAssessmentCompletionEmail = async (userEmail, userName, assessmentData) => {
    console.log('Starting assessment completion email for:', userEmail);
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const transporter = createTransporter();
            const mailOptions = {
                from: {
                    name: 'FitWit AI',
                    address: process.env.SMTP_USER
                },
                to: userEmail,
                subject: '🎉 Your FitWit AI Assessment is Complete!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background-color: #4ecdc4; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0;">Assessment Complete!</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your personalized fitness journey awaits</p>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                            <h2 style="color: #4ecdc4; margin-top: 0;">Hello ${userName},</h2>
                            <p>Thank you for completing your fitness assessment! We've created your personalized plan.</p>
                            
                            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                <h3 style="color: #4ecdc4; margin-top: 0;">Your Next Steps:</h3>
                                <ul style="padding-left: 20px; line-height: 1.6;">
                                    <li>Review your personalized workout plan</li>
                                    <li>Set up your workout schedule</li>
                                    <li>Start your first workout session</li>
                                    <li>Track your progress</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px; color: #6c757d;">
                            <p style="margin: 5px 0;">Let's achieve your fitness goals together!</p>
                            <small style="opacity: 0.7;">© ${new Date().getFullYear()} Fit With AI. All rights reserved.</small>
                        </div>
                    </div>
                `
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Assessment completion email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed:`, error);
            lastError = error;
            
            if (attempt < maxRetries) {
                const delay = attempt * 1000;
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw new Error(`Failed to send assessment email after ${maxRetries} attempts. Last error: ${lastError.message}`);
};

module.exports = {
    sendWelcomeEmail,
    sendAssessmentCompletionEmail,
    createTransporter
}; 

