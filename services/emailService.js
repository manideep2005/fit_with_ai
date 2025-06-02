const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

// Create transporter object using Gmail SMTP
const createTransporter = () => {
    if (transporter) return transporter;
    
    try {
        console.log('📧 Creating email transporter...');
        console.log('📧 SMTP User:', process.env.SMTP_USER ? '✅ Set' : '❌ Missing');
        console.log('📧 SMTP Pass:', process.env.SMTP_PASS ? '✅ Set' : '❌ Missing');

        transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER || 'manideepgonugunta2005@gmail.com',
                pass: process.env.SMTP_PASS || 'sxpbzvbyiphxljph'
            },
            debug: true, // Enable debug logging
            logger: true // Enable built-in logger
        });

        console.log('✅ Email transporter created successfully');
        return transporter;
    } catch (error) {
        console.error('❌ Failed to create email transporter:', error);
        return null;
    }
};

// Verify connection configuration with retries
const verifyConnection = async () => {
    console.log('🔍 Starting email service verification...');
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ Email service disabled - missing SMTP credentials');
        console.log('Required environment variables:');
        console.log('SMTP_USER:', process.env.SMTP_USER ? '✅ Set' : '❌ Missing');
        console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Missing');
        return false;
    }

    const transport = createTransporter();
    if (!transport) {
        console.error('❌ Failed to create email transporter');
        return false;
    }

    console.log('🔍 Verifying SMTP connection...');
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📧 Verification attempt ${attempt}/${maxRetries}...`);
            await transport.verify();
            console.log('✅ SMTP connection verified and ready');
            return true;
        } catch (error) {
            console.error(`❌ SMTP connection error (attempt ${attempt}/${maxRetries}):`, error);
            console.error('Error details:', {
                code: error.code,
                command: error.command,
                response: error.response,
                responseCode: error.responseCode
            });
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

const sendWelcomeEmail = async (userEmail, userName) => {
    if (!transporter) {
        console.warn('⚠️ Email service not initialized - skipping welcome email');
        return { success: false, error: 'Email service not initialized' };
    }

    console.log('Starting welcome email send process for:', userEmail);
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📧 Attempt ${attempt}: Preparing to send welcome email...`);
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

                            <div style="margin-top: 30px; text-align: center;">
                                <h3 style="color: #4ecdc4;">Our Core Features:</h3>
                                <div style="display: inline-block; text-align: left;">
                                    <ul style="line-height: 1.8;">
                                        <li><strong>Custom Onboarding:</strong> Personalized to your medical conditions</li>
                                        <li><strong>Condition-Based Dashboards:</strong> Track what matters most to you</li>
                                        <li><strong>Google Fit Integration:</strong> Real-time health data import</li>
                                        <li><strong>Daily Summary:</strong> Smart reports with insights</li>
                                        <li><strong>AI Meal Suggestions:</strong> Personalized nutrition planning</li>
                                        <li><strong>General Tracking:</strong> Monitor all aspects of your fitness journey</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px; color: #6c757d;">
                            <p style="margin: 5px 0;">Thank you for choosing Fit With AI!</p>
                            <small style="opacity: 0.7;">© ${new Date().getFullYear()} Fit With AI. All rights reserved.</small>
                        </div>
                    </div>
                `
            };

            console.log(`📧 Attempt ${attempt}: Sending welcome email to:`, userEmail);
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Welcome email sent successfully:', info.messageId);
            console.log('📬 Preview URL:', nodemailer.getTestMessageUrl(info));
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed:`, error);
            console.error('Error details:', {
                code: error.code,
                command: error.command,
                response: error.response,
                responseCode: error.responseCode
            });
            lastError = error;
            
            if (attempt < maxRetries) {
                const delay = attempt * 1000;
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    return { 
        success: false, 
        error: `Failed to send welcome email after ${maxRetries} attempts`,
        details: lastError?.message 
    };
};

const sendAssessmentCompletionEmail = async (userEmail, userName, mailOptions = null) => {
    if (!transporter) {
        console.warn('⚠️ Email service not initialized - skipping assessment email');
        return { success: false, error: 'Email service not initialized' };
    }

    console.log('Starting assessment completion email for:', userEmail);
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📧 Attempt ${attempt}: Preparing to send assessment email...`);
            // Use provided mail options or create default ones
            const emailOptions = mailOptions || {
                from: {
                    name: 'FitWit AI',
                    address: process.env.SMTP_USER
                },
                to: userEmail,
                subject: '🎉 Your FitWit AI Assessment is Complete!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4ecdc4;">Congratulations ${userName}! 🎉</h2>
                        <p>Your fitness assessment is complete and we've created a personalized plan for you.</p>
                        <p>Check your dashboard to:</p>
                        <ul>
                            <li>View your personalized workout plan</li>
                            <li>Track your progress</li>
                            <li>Get nutrition recommendations</li>
                            <li>Connect with fitness experts</li>
                        </ul>
                        <p>Let's achieve your fitness goals together!</p>
                    </div>
                `
            };

            console.log(`📧 Attempt ${attempt}: Sending assessment email to:`, userEmail);
            const info = await transporter.sendMail(emailOptions);
            console.log('✅ Assessment email sent successfully:', info.messageId);
            console.log('📬 Preview URL:', nodemailer.getTestMessageUrl(info));
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed:`, error);
            console.error('Error details:', {
                code: error.code,
                command: error.command,
                response: error.response,
                responseCode: error.responseCode
            });
            lastError = error;
            
            if (attempt < maxRetries) {
                const delay = attempt * 1000;
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    return { 
        success: false, 
        error: `Failed to send assessment email after ${maxRetries} attempts`,
        details: lastError?.message 
    };
};

// Initialize the email service
const initializeEmailService = async () => {
    const isConnected = await verifyConnection();
    if (!isConnected) {
        console.warn('⚠️ Email service initialization failed - some features may not work');
    }
    return isConnected;
};

module.exports = {
    sendWelcomeEmail,
    sendAssessmentCompletionEmail,
    initializeEmailService,
    createTransporter
};

