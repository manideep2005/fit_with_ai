const express = require('express');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

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

// Create transporter object using Gmail SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER || 'fitwitai18@gmail.com',
        pass: process.env.SMTP_PASS || 'zjmqcqmgcfszsmz'
    }
});

// Verify connection configuration with retries
const verifyConnection = async () => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ Email configuration missing. Please set SMTP_USER and SMTP_PASS in .env file');
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

// Initialize email configuration
(async () => {
    await verifyConnection();
})();

// Function to send welcome email with retry mechanism
async function sendWelcomeEmail(userEmail, fullName) {
    console.log('Starting welcome email send process for:', userEmail);
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt}: Preparing welcome email for ${userEmail}`);
            const mailOptions = {
                from: {
                    name: 'FitWit AI',
                    address: process.env.SMTP_USER || 'fitwitai18@gmail.com'
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
                            <h2 style="color: #4ecdc4; margin-top: 0;">Hello ${fullName},</h2>
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

                            <div style="background-color: #e8f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                <p style="margin: 0; color: #2a9187;">
                                    <strong>Getting Started:</strong>
                                </p>
                                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #2a9187;">
                                    <li>Fill out your fitness profile</li>
                                    <li>Set your fitness goals</li>
                                    <li>Choose your preferred workout times</li>
                                    <li>Start your personalized fitness journey</li>
                                </ul>
                            </div>

                            <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: white; border-radius: 5px;">
                                <p style="color: #4ecdc4; font-size: 1.2em; margin: 0;">Ready to transform your fitness journey? 💪</p>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px; color: #6c757d;">
                            <p style="margin: 5px 0;">Thank you for choosing Fit With AI!</p>
                            <small style="opacity: 0.7;">© ${new Date().getFullYear()} Fit With AI. All rights reserved.</small>
                        </div>
                    </div>
                `
            };

            console.log('Attempting to send welcome email...');
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
}

// Function to generate and send PDF
async function generateAndSendPDF(userData, userEmail) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const fileName = `onboarding_details_${Date.now()}.pdf`;
            const filePath = path.join(__dirname, 'temp', fileName);

            // Ensure temp directory exists
            if (!fs.existsSync(path.join(__dirname, 'temp'))) {
                fs.mkdirSync(path.join(__dirname, 'temp'));
            }

            // Pipe PDF to file
            doc.pipe(fs.createWriteStream(filePath));

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

            // Finalize PDF
            doc.end();

            // Send PDF via email
            doc.on('end', async () => {
                try {
                    const mailOptions = {
                        from: process.env.SMTP_USER || 'fitwitai18@gmail.com',
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
                                    <li>11-Step Fitness Journey</li>
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

                    await transporter.sendMail(mailOptions);
                    console.log('Assessment PDF sent successfully');

                    // Clean up: delete the temporary file
                    fs.unlink(filePath, (err) => {
                        if (err) console.error('Error deleting temporary PDF:', err);
                    });

                    resolve();
                } catch (error) {
                    console.error('Error sending assessment email:', error);
                    reject(error);
                }
            });
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
    if (!req.session || !req.session.userData) {
        return res.redirect('/');
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
        // Clear any existing session to ensure fresh start
        if (!req.session.userData) {
            // For non-logged in users, always show index page
            return res.render('index', { user: null });
        }

        // Only redirect if user is explicitly logged in
        if (req.session.userData && !req.session.userData.isOnboarded) {
            return res.redirect('/custom-onboarding');
        }
        
        if (req.session.userData && req.session.userData.isOnboarded) {
            return res.redirect('/dashboard');
        }

        // Default to index page
        return res.render('index', { user: null });
    } catch (error) {
        console.error('Error rendering index:', error);
        res.status(500).json({ error: 'Error rendering page' });
    }
});

// Login route
app.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        // For testing purposes
        if (email === "test@example.com" && password === "password") {
            req.session.userData = {
                id: 1,
                email: email,
                fullName: "Test User",
                isOnboarded: false
            };
            return res.json({ 
                success: true, 
                redirectTo: '/custom-onboarding'
            });
        } else {
            res.json({ success: false, error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Signup route
app.post('/signup', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        
        if (!fullName || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        // Create session
        req.session.userData = {
            id: Date.now(),
            email: email,
            fullName: fullName,
            isOnboarded: false
        };

        res.json({ 
            success: true, 
            redirectTo: '/custom-onboarding',
            message: 'Account created successfully!'
        });

        // Send welcome email in background
        try {
            await sendWelcomeEmail(email, fullName);
        } catch (emailError) {
            console.error('Welcome email error:', emailError);
        }
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Custom onboarding route
app.get('/custom-onboarding', requireAuth, (req, res) => {
    try {
        // If already onboarded, go to dashboard
        if (req.session.userData.isOnboarded) {
            return res.redirect('/dashboard');
        }

        // Show onboarding for logged-in, non-onboarded users
        res.render('custom-onboarding', { 
            user: req.session.userData,
            error: req.query.error
        });
    } catch (error) {
        console.error('Onboarding error:', error);
        res.status(500).json({ error: 'Error rendering onboarding page' });
    }
});

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
                error: 'Required fields are missing' 
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
        } catch (pdfError) {
            console.error('PDF generation error:', pdfError);
            // Continue even if PDF fails
        }

        // Send success response with redirect URL
        return res.json({ 
            success: true, 
            redirectTo: '/dashboard'
        });
    } catch (error) {
        console.error('Onboarding save error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            details: error.message
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
    req.session.destroy();
    res.redirect('/');
});

// Test email endpoint
app.get('/test-email', async (req, res) => {
    try {
        const testMailOptions = {
            from: process.env.SMTP_USER || 'fitwitai18@gmail.com',
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

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ 
        error: 'An error occurred',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// Function to find an available port
const findAvailablePort = (startPort) => {
    return new Promise((resolve, reject) => {
        const server = require('net').createServer();
        server.unref();
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
        server.listen(startPort, () => {
            server.close(() => {
                resolve(startPort);
            });
        });
    });
};

// Start server with error handling
const startServer = async () => {
    try {
        const PORT = await findAvailablePort(process.env.PORT || 3000);
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        }).on('error', (err) => {
            console.error('Server failed to start:', err);
            process.exit(1);
        });
    } catch (error) {
        console.error('Failed to find available port:', error);
        process.exit(1);
    }
};

startServer(); 