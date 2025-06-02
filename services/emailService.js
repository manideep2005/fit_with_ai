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
    // Temporarily disable email sending for testing
    console.log('Welcome email would be sent to:', userEmail);
    return true;
};

const sendAssessmentCompletionEmail = async (userEmail, userName, assessmentData) => {
    // Temporarily disable email sending for testing
    console.log('Assessment email would be sent to:', userEmail);
    return true;
};

module.exports = {
    sendWelcomeEmail,
    sendAssessmentCompletionEmail
}; 

