const nodemailer = require('nodemailer');

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'w25087926@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'ncrewxbcwgxmpxcq'
    }
});

const sendWelcomeEmail = async (userEmail, userName) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: 'Welcome to Fit-With-AI!',
            html: `
                <h1>Welcome to Fit-With-AI, ${userName}!</h1>
                <p>Thank you for joining our fitness community. We're excited to help you on your fitness journey!</p>
                <p>Get ready to:</p>
                <ul>
                    <li>Track your workouts</li>
                    <li>Monitor your nutrition</li>
                    <li>Achieve your fitness goals</li>
                </ul>
                <p>Best regards,<br>The Fit-With-AI Team</p>
            `
        });
        console.log('Welcome email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return false;
    }
};

const sendAssessmentCompletionEmail = async (userEmail, userName, assessmentData) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: 'Your Fit-With-AI Assessment Results',
            html: `
                <h1>Assessment Complete!</h1>
                <p>Hi ${userName},</p>
                <p>Thank you for completing your fitness assessment. Here's a summary of your profile:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
                    <p><strong>Fitness Goals:</strong> ${assessmentData.fitnessGoals}</p>
                    <p><strong>Activity Level:</strong> ${assessmentData.activityLevel}</p>
                    <p><strong>Health Conditions:</strong> ${assessmentData.medicalConditions || 'None'}</p>
                </div>
                <p>You can view your complete profile and start your fitness journey by logging into your dashboard.</p>
                <p>Best regards,<br>The Fit-With-AI Team</p>
            `
        });
        console.log('Assessment completion email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending assessment email:', error);
        return false;
    }
};

module.exports = {
    sendWelcomeEmail,
    sendAssessmentCompletionEmail
}; 

