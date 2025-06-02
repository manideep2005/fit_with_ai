const express = require('express');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { 
    sendWelcomeEmail, 
    sendAssessmentCompletionEmail, 
    initializeEmailService 
} = require('./services/emailService');
require('dotenv').config();

const app = express();

// Add this after the other requires at the top
const registeredEmails = new Set(['test@example.com']); // Pre-add test email

// Debug route for environment variables (development only)
if (process.env.NODE_ENV === 'development') {
    app.get('/debug-env', (req, res) => {
        res.json({
            environment: process.env.NODE_ENV,
            smtp_user_set: !!process.env.SMTP_USER,
            smtp_pass_set: !!process.env.SMTP_PASS,
            session_secret_set: !!process.env.SESSION_SECRET,
            port_set: !!process.env.PORT,
            smtp_user_correct: process.env.SMTP_USER === 'fitwitai18@gmail.com',
            port_value: process.env.PORT || 3000
        });
    });
}

// Debug route for environment variables
app.get('/debug-env', (req, res) => {
    res.json({
        environment: process.env.NODE_ENV,
        smtp_user_set: !!process.env.SMTP_USER,
        smtp_pass_set: !!process.env.SMTP_PASS,
        session_secret_set: !!process.env.SESSION_SECRET,
        port_set: !!process.env.PORT,
        smtp_user_correct: process.env.SMTP_USER === 'fitwitai18@gmail.com',
        port_value: process.env.PORT || 3000,
        app_url: process.env.APP_URL,
        base_url: process.env.BASE_URL
    });
});

// Production settings
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    app.enable('trust proxy');
}

// Cache control middleware for dynamic routes
app.use((req, res, next) => {
    // Skip for static files
    if (req.path.startsWith('/public/') || 
        req.path.startsWith('/js/') || 
        req.path.startsWith('/css/') || 
        req.path.startsWith('/images/') || 
        req.path.startsWith('/videos/')) {
        return next();
    }
    
    // Set headers to prevent caching for dynamic routes
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    next();
});

// Create transporter object using Gmail SMTP only if credentials are available
let transporter = null;

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
} else {
    console.warn('⚠️ Email functionality disabled - missing SMTP credentials');
}

// Verify connection configuration with retries
const verifyConnection = async () => {
    if (!transporter) {
        console.warn('⚠️ Skipping SMTP verification - transporter not configured');
        return false;
    }

    console.log('🔍 Verifying SMTP connection...');
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await transporter.verify();
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

// Initialize email service
(async () => {
    try {
        await initializeEmailService();
    } catch (error) {
        console.error('Failed to initialize email service:', error);
    }
})();

// Function to generate and send PDF
async function generateAndSendPDF(userData, userEmail) {
    return new Promise((resolve, reject) => {
        try {
            console.log('Starting PDF generation for:', userEmail);
            const doc = new PDFDocument();
            const fileName = `onboarding_details_${Date.now()}.pdf`;
            const filePath = path.join(__dirname, 'temp', fileName);

            // Ensure temp directory exists
            if (!fs.existsSync(path.join(__dirname, 'temp'))) {
                fs.mkdirSync(path.join(__dirname, 'temp'));
            }

            // Pipe PDF to file
            const writeStream = fs.createWriteStream(filePath);
            doc.pipe(writeStream);

            // Add header with logo placeholder
            doc.fontSize(28)
               .fillColor('#4ecdc4')
               .text('FitWit AI - Your Fitness Journey', { align: 'center' });
            
            doc.moveDown();
            doc.fontSize(20)
               .fillColor('#333')
               .text(`Personalized Fitness Plan for ${userData.fullName}`, { align: 'center' });

            // Add date
            doc.moveDown(0.5);
            doc.fontSize(12)
               .fillColor('#666')
               .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

            // Personal Information Section
            doc.moveDown(2);
            doc.fontSize(18)
               .fillColor('#4ecdc4')
               .text('Personal Information', { underline: true });
            
            doc.moveDown();
            const details = [
                { label: 'Age', value: userData.userDetails.age },
                { label: 'Gender', value: userData.userDetails.gender },
                { label: 'Height', value: userData.userDetails.height },
                { label: 'Weight', value: userData.userDetails.weight },
                { label: 'BMI', value: calculateBMI(userData.userDetails.height, userData.userDetails.weight) },
                { label: 'Activity Level', value: userData.userDetails.activityLevel },
                { label: 'Medical Conditions', value: userData.userDetails.medicalConditions || 'None reported' }
            ];

            details.forEach(detail => {
                doc.fontSize(12)
                   .fillColor('#444')
                   .text(`${detail.label}: `, { continued: true })
                   .fillColor('#666')
                   .text(detail.value);
                doc.moveDown(0.5);
            });

            // Fitness Goals Section
            doc.moveDown(2);
            doc.fontSize(18)
               .fillColor('#4ecdc4')
               .text('Your Fitness Goals', { underline: true });
            
            doc.moveDown();
            doc.fontSize(12)
               .fillColor('#666')
               .text(userData.userDetails.fitnessGoals);

            // Custom Onboarding Steps Section
            doc.moveDown(2);
            doc.fontSize(18)
               .fillColor('#4ecdc4')
               .text('Your 11-Step Fitness Journey', { underline: true });

            doc.moveDown();
            const steps = [
                { title: 'Initial Assessment', description: 'Complete baseline fitness evaluation and body measurements' },
                { title: 'Goal Setting', description: 'Define specific, measurable, and time-bound fitness objectives' },
                { title: 'Nutrition Planning', description: 'Develop personalized meal plans and dietary guidelines' },
                { title: 'Workout Schedule', description: 'Create customized workout routines based on your availability' },
                { title: 'Exercise Form', description: 'Learn proper form and technique for key exercises' },
                { title: 'Progress Tracking', description: 'Set up metrics and methods to monitor your progress' },
                { title: 'Recovery Strategy', description: 'Plan rest days and recovery techniques' },
                { title: 'Lifestyle Integration', description: 'Incorporate fitness habits into your daily routine' },
                { title: 'Support System', description: 'Connect with workout partners and community' },
                { title: 'Milestone Planning', description: 'Set intermediate goals and reward systems' },
                { title: 'Long-term Success', description: 'Develop strategies for maintaining progress' }
            ];

            steps.forEach((step, index) => {
                doc.moveDown();
                doc.fontSize(14)
                   .fillColor('#4ecdc4')
                   .text(`${index + 1}. ${step.title}`, { underline: true });
                
                doc.moveDown(0.5);
                doc.fontSize(12)
                   .fillColor('#666')
                   .text(step.description);
            });

            // Recommendations Section
            doc.moveDown(2);
            doc.fontSize(18)
               .fillColor('#4ecdc4')
               .text('Personalized Recommendations', { underline: true });

            doc.moveDown();
            const activityLevel = userData.userDetails.activityLevel.toLowerCase();
            const recommendations = getRecommendations(activityLevel);
            
            recommendations.forEach(rec => {
                doc.fontSize(12)
                   .fillColor('#666')
                   .text(`• ${rec}`);
                doc.moveDown(0.5);
            });

            // Footer
            doc.moveDown(2);
            doc.fontSize(10)
               .fillColor('#888')
               .text('This plan is personalized based on your inputs. Always consult with a healthcare professional before starting any new exercise program.', {
                   align: 'center',
                   width: 400
               });

            // Handle PDF completion
            writeStream.on('finish', async () => {
                try {
                    console.log('PDF generated, sending email...');
                    // Send email with PDF attachment
                    const mailOptions = {
                        from: {
                            name: 'FitWit AI',
                            address: process.env.SMTP_USER
                        },
                        to: userEmail,
                        subject: '🏋️‍♂️ Your FitWit AI Personalized Fitness Plan',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #4ecdc4;">Your Personalized Fitness Plan is Ready! 🎉</h2>
                                <p>Thank you for completing your fitness assessment! We've created a comprehensive plan just for you.</p>
                                <p>Attached is your personalized fitness journey document that includes:</p>
                                <ul>
                                    <li>Your Personal Information</li>
                                    <li>Fitness Goals</li>
                                    <li>Customized Recommendations</li>
                                </ul>
                                <p>Review your plan and let's start your fitness journey together!</p>
                                <p>If you have any questions, our team is here to help!</p>
                            </div>
                        `,
                        attachments: [{
                            filename: 'FitWit_AI_Fitness_Plan.pdf',
                            path: filePath
                        }]
                    };

                    const { sendAssessmentCompletionEmail } = require('./services/emailService');
                    await sendAssessmentCompletionEmail(userEmail, userData.fullName, mailOptions);
                    console.log('Assessment email sent successfully');

                    // Clean up: delete the temporary file
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error('Error deleting temporary PDF:', err);
                        } else {
                            console.log('Temporary PDF file deleted');
                        }
                    });

                    resolve();
                } catch (error) {
                    console.error('Error sending assessment email:', error);
                    reject(error);
                }
            });

            writeStream.on('error', (error) => {
                console.error('Error writing PDF:', error);
                reject(error);
            });

            // End the document
            doc.end();
        } catch (error) {
            console.error('Error generating PDF:', error);
            reject(error);
        }
    });
}

// Helper function to calculate BMI
function calculateBMI(height, weight) {
    // Assuming height is in cm and weight in kg
    const heightInMeters = parseFloat(height) / 100;
    const weightInKg = parseFloat(weight);
    const bmi = weightInKg / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
}

// Helper function to get recommendations based on activity level
function getRecommendations(activityLevel) {
    if (activityLevel.includes('beginner') || activityLevel.includes('low')) {
        return [
            'Start with 2-3 workout sessions per week',
            'Focus on bodyweight exercises to build foundation',
            'Include 20-30 minutes of light cardio',
            'Prioritize proper form over intensity',
            'Take rest days between workouts',
            'Stay hydrated with 8-10 glasses of water daily',
            'Get 7-8 hours of sleep for recovery'
        ];
    } else if (activityLevel.includes('moderate')) {
        return [
            'Aim for 3-4 workout sessions per week',
            'Mix strength training and cardio',
            'Include HIIT workouts twice a week',
            'Focus on compound exercises',
            'Plan active recovery days',
            'Track macro nutrients',
            'Consider pre and post-workout nutrition'
        ];
    } else {
        return [
            'Maintain 4-5 intense workout sessions weekly',
            'Implement progressive overload',
            'Include specialized training splits',
            'Add advanced movement patterns',
            'Focus on periodization',
            'Monitor heart rate zones',
            'Plan deload weeks for optimal recovery'
        ];
    }
}

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files BEFORE other middleware
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Replace express-session with cookie-session
app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'your-secret-key'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    console.log('Auth check - Session:', req.session);
    if (!req.session || !req.session.userData) {
        console.log('No auth, redirecting to index');
        req.session = null; // Clear any invalid session
        return res.redirect('/?error=auth_required');
    }
    next();
};

// Basic error handler for views
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (err.code === 'ENOENT' && err.message.includes('.ejs')) {
        return res.status(404).json({ error: 'View not found' });
    }
    next(err);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Routes
app.get('/', (req, res) => {
    try {
        console.log('Session data:', req.session);
        
        // If no session exists or session is invalid, show index page
        if (!req.session || !req.session.userData) {
            console.log('No session, showing index page');
            req.session = null; // Clear any invalid session
            return res.render('index', { user: null });
        }

        // If user is onboarded, go to dashboard
        if (req.session.userData.isOnboarded) {
            console.log('User is onboarded, redirecting to dashboard');
            return res.redirect('/dashboard');
        }

        // If user is logged in but not onboarded, go to onboarding
        if (req.session.userData && !req.session.userData.isOnboarded) {
            console.log('User not onboarded, redirecting to onboarding');
            return res.redirect('/custom-onboarding');
        }

        // Default to index page
        console.log('Default case, showing index page');
        return res.render('index', { user: null });
    } catch (error) {
        console.error('Error in root route:', error);
        req.session = null; // Clear session on error
        res.status(500).json({ error: 'Error rendering page' });
    }
});

// Login route
app.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Clear any existing session first
        req.session = null;

        // For testing purposes
        if (email === "test@example.com" && password === "password") {
            // Create new session
            req.session = {
                userData: {
                    id: 1,
                    email: email,
                    fullName: "Test User",
                    isOnboarded: false
                }
            };
            
            console.log('Login successful, session created:', req.session);
            
            return res.json({ 
                success: true, 
                redirectTo: '/custom-onboarding'
            });
        } else {
            console.log('Login failed: Invalid credentials');
            return res.json({ 
                success: false, 
                error: 'Invalid credentials',
                redirectTo: '/'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        req.session = null;
        res.status(500).json({ 
            error: 'Internal server error',
            redirectTo: '/'
        });
    }
});

// Signup route
app.post('/signup', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        
        console.log('📝 Signup attempt:', { fullName, email });
        
        // Clear any existing session first
        req.session = null;
        
        if (!fullName || !email || !password) {
            console.log('❌ Missing required fields:', { fullName: !!fullName, email: !!email, password: !!password });
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields',
                redirectTo: '/'
            });
        }

        // Check if email already exists
        if (registeredEmails.has(email)) {
            console.log('❌ Email already exists:', email);
            return res.status(400).json({
                success: false,
                error: 'This email is already registered. Please sign in instead.',
                isExistingUser: true,
                redirectTo: '/?signin=true'
            });
        }

        // Add email to registered set
        registeredEmails.add(email);

        // Create new session
        req.session = {
            userData: {
                id: Date.now(),
                email: email,
                fullName: fullName,
                isOnboarded: false
            }
        };

        console.log('✅ Session created:', req.session);

        // Send welcome email in background
        try {
            console.log('📧 Attempting to send welcome email to:', email);
            const emailResult = await sendWelcomeEmail(email, fullName);
            console.log('📧 Welcome email result:', emailResult);
            
            if (!emailResult.success) {
                console.error('❌ Welcome email failed:', emailResult.error);
            }
        } catch (emailError) {
            console.error('❌ Welcome email error:', emailError);
            // Continue even if email fails
        }

        res.json({ 
            success: true, 
            redirectTo: '/custom-onboarding',
            message: 'Account created successfully!'
        });
    } catch (error) {
        console.error('❌ Signup error:', error);
        req.session = null;
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            details: error.message,
            redirectTo: '/'
        });
    }
});

// Custom onboarding route
app.get('/custom-onboarding', requireAuth, (req, res) => {
    try {
        console.log('Onboarding route - Session:', req.session);
        
        // If not logged in, redirect to index
        if (!req.session || !req.session.userData) {
            console.log('No session in onboarding, redirecting to index');
            req.session = null; // Clear any invalid session
            return res.redirect('/');
        }

        // If already onboarded, go to dashboard
        if (req.session.userData.isOnboarded) {
            console.log('User already onboarded, redirecting to dashboard');
            return res.redirect('/dashboard');
        }

        // Show onboarding for logged-in, non-onboarded users
        console.log('Rendering onboarding page');
        res.render('custom-onboarding', { 
            user: req.session.userData,
            error: req.query.error,
            totalSteps: 8 // Add this to fix the progress bar
        });
    } catch (error) {
        console.error('Onboarding error:', error);
        req.session = null; // Clear session on error
        res.redirect('/?error=onboarding_failed');
    }
});

// Handle onboarding form submission
app.post('/custom-onboarding', requireAuth, async (req, res) => {
    try {
        console.log('POST /custom-onboarding - Body:', req.body);
        console.log('Session:', req.session);
        
        const { 
            firstName, lastName, age, gender, height, weight,
            occupation, email, phone, targetWeight, bodyType,
            fitnessGoals, medicalConditions, activityLevel,
            exerciseTypes, stressLevel, anxietyLevel,
            healthScreenings
        } = req.body;
        
        // Validate required fields
        if (!age || !gender || !height || !weight || !firstName || !lastName || !email) {
            console.log('Missing required fields');
            return res.status(400).json({ 
                success: false, 
                error: 'Required fields are missing',
                redirectTo: '/custom-onboarding'
            });
        }

        // Update user data in session
        req.session.userData = {
            ...req.session.userData,
            isOnboarded: true,
            userDetails: {
                firstName,
                lastName,
                age,
                gender,
                height,
                weight,
                occupation,
                email,
                phone,
                targetWeight,
                bodyType,
                fitnessGoals,
                medicalConditions,
                activityLevel,
                exerciseTypes,
                stressLevel,
                anxietyLevel,
                healthScreenings
            }
        };

        console.log('Updated session:', req.session);

        try {
            // Generate and send PDF
            await generateAndSendPDF(req.session.userData, email);
            console.log('PDF generated and sent successfully');

            // Send assessment completion email
            const fullName = `${firstName} ${lastName}`;
            const mailOptions = {
                from: {
                    name: 'FitWit AI',
                    address: process.env.SMTP_USER
                },
                to: email,
                subject: '🎉 Your Fitness Assessment is Complete!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4ecdc4;">Congratulations ${fullName}! 🎉</h2>
                        <p>Thank you for completing your comprehensive fitness assessment. We're excited to be part of your fitness journey!</p>
                        <p>Here's what happens next:</p>
                        <ol>
                            <li>Review your personalized fitness plan (attached PDF)</li>
                            <li>Access your dashboard to track your progress</li>
                            <li>Start your customized workout routines</li>
                            <li>Track your nutrition and health metrics</li>
                        </ol>
                        <p>Remember, consistency is key to achieving your fitness goals. We're here to support you every step of the way!</p>
                        <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
                            <p style="margin: 0;"><strong>Your Key Stats:</strong></p>
                            <ul style="margin: 10px 0;">
                                <li>Current Weight: ${weight} kg</li>
                                <li>Target Weight: ${targetWeight} kg</li>
                                <li>Activity Level: ${activityLevel}</li>
                                <li>Primary Goals: ${fitnessGoals}</li>
                            </ul>
                        </div>
                        <p style="margin-top: 20px;">Ready to begin? <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" style="color: #4ecdc4;">Visit your dashboard</a></p>
                    </div>
                `
            };

            const emailResult = await sendAssessmentCompletionEmail(email, fullName, mailOptions);
            console.log('Assessment completion email result:', emailResult);

            if (!emailResult.success) {
                console.error('Assessment completion email failed:', emailResult.error);
                // Continue even if email fails
            }
        } catch (error) {
            console.error('Error in email/PDF generation:', error);
            // Continue even if email/PDF fails
        }

        // Send success response with redirect URL
        return res.json({ 
            success: true, 
            redirectTo: '/dashboard'
        });
    } catch (error) {
        console.error('Onboarding save error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            details: error.message,
            redirectTo: '/custom-onboarding'
        });
    }
});

// Dashboard route
app.get('/dashboard', requireAuth, (req, res) => {
    try {
        // Must complete onboarding first
        if (!req.session.userData.isOnboarded) {
            return res.redirect('/custom-onboarding');
        }
        
        res.render('dashboard', {
            user: req.session.userData
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Error rendering dashboard' });
    }
});

// Workouts Route
app.get('/workouts', requireAuth, (req, res) => {
    try {
        res.render('workouts', {
            user: req.session.userData
        });
    } catch (error) {
        console.error('Workouts error:', error);
        res.status(500).json({ error: 'Error rendering workouts page' });
    }
});

// Nutrition Route
app.get('/nutrition', requireAuth, (req, res) => {
    try {
        res.render('nutrition', {
            user: req.session.userData
        });
    } catch (error) {
        console.error('Nutrition error:', error);
        res.status(500).json({ error: 'Error rendering nutrition page' });
    }
});

// Health Metrics Route
app.get('/health-metrics', requireAuth, (req, res) => {
    try {
        res.render('health-metrics', {
            user: req.session.userData
        });
    } catch (error) {
        console.error('Health metrics error:', error);
        res.status(500).json({ error: 'Error rendering health metrics page' });
    }
});

// Meal Suggestions Route
app.get('/meal-suggestions', requireAuth, (req, res) => {
    try {
        res.render('meal-suggestions', {
            user: req.session.userData
        });
    } catch (error) {
        console.error('Meal suggestions error:', error);
        res.status(500).json({ error: 'Error rendering meal suggestions page' });
    }
});

// Google Fit Route
app.get('/google-fit', requireAuth, (req, res) => {
    try {
        res.render('google-fit', {
            user: req.session.userData
        });
    } catch (error) {
        console.error('Google Fit error:', error);
        res.status(500).json({ error: 'Error rendering Google Fit page' });
    }
});

// Doctor Consult Route
app.get('/doctor-consult', requireAuth, (req, res) => {
    try {
        res.render('doctor-consult', {
            user: req.session.userData
        });
    } catch (error) {
        console.error('Doctor consult error:', error);
        res.status(500).json({ error: 'Error rendering doctor consultation page' });
    }
});

// Settings Route
app.get('/settings', requireAuth, (req, res) => {
    try {
        res.render('settings', {
            user: req.session.userData
        });
    } catch (error) {
        console.error('Settings error:', error);
        res.status(500).json({ error: 'Error rendering settings page' });
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    try {
        console.log('Logging out user');
        req.session = null; // Clear the session
        res.redirect('/');
    } catch (error) {
        console.error('Logout error:', error);
        res.redirect('/');
    }
});

// Test email endpoint
app.get('/test-email', async (req, res) => {
    try {
        const testMailOptions = {
            from: {
                name: 'FitWit AI',
                address: process.env.SMTP_USER || 'fitwitai18@gmail.com'
            },
            to: req.session.userData ? req.session.userData.email : 'fitwitai18@gmail.com',
            subject: 'Test Email from FitWit AI',
            text: 'This is a test email from FitWit AI application.',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h1 style="color: #4ecdc4;">Test Email</h1>
                    <p>This is a test email from FitWit AI application.</p>
                    <p>If you receive this, the email service is working correctly!</p>
                    <p>Time sent: ${new Date().toLocaleString()}</p>
                </div>
            `
        };

        const info = await transporter.sendMail(testMailOptions);
        console.log('Test email sent successfully:', info.messageId);
        res.json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.response || 'No additional details'
        });
    }
});

// Nutrition Report Email Route
app.post('/api/send-nutrition-report', async (req, res) => {
    try {
        const { nutritionData } = req.body;
        
        // Create email HTML content
        const emailContent = `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { color: #4ecdc4; }
                    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
                    .stat-card { background: #f5f5f5; padding: 15px; border-radius: 10px; }
                    .stat-title { font-weight: bold; margin-bottom: 10px; }
                    .stat-values { font-size: 18px; }
                    .meals-section { margin-bottom: 30px; }
                    .meal-card { background: #f5f5f5; padding: 15px; border-radius: 10px; margin-bottom: 15px; }
                    .meal-title { font-weight: bold; margin-bottom: 10px; }
                    .meal-item { margin-bottom: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Your Daily Nutrition Report</h1>
                        <p>Here's your nutrition summary for ${new Date().toLocaleDateString()}</p>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-title">Calories</div>
                            <div class="stat-values">${nutritionData.calories.current} / ${nutritionData.calories.target}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-title">Protein</div>
                            <div class="stat-values">${nutritionData.protein.current} / ${nutritionData.protein.target}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-title">Carbs</div>
                            <div class="stat-values">${nutritionData.carbs.current} / ${nutritionData.carbs.target}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-title">Fats</div>
                            <div class="stat-values">${nutritionData.fats.current} / ${nutritionData.fats.target}</div>
                        </div>
                    </div>

                    <div class="meals-section">
                        <h2>Today's Meals</h2>
                        ${Object.entries(nutritionData.meals)
                            .map(([title, items]) => `
                                <div class="meal-card">
                                    <div class="meal-title">${title}</div>
                                    ${items.map(item => `<div class="meal-item">${item}</div>`).join('')}
                                </div>
                            `).join('')}
                    </div>
                </div>
            </body>
            </html>
        `;

        // Configure email options
        const mailOptions = {
            from: 'fitwitai18@gmail.com',
            to: req.session.user.email, // Assuming user email is stored in session
            subject: 'Your Daily Nutrition Report',
            html: emailContent
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: 'Nutrition report sent successfully!' });
    } catch (error) {
        console.error('Error sending nutrition report:', error);
        res.status(500).json({ success: false, message: 'Failed to send nutrition report' });
    }
});

// Error handling middleware (place this before other routes)
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Export the Express app
module.exports = app; 