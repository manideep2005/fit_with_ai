const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Gmanideep1802$', // Add your MySQL password here
    database: 'fit_wit_ai'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Move static files to public directory
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userData) {
        res.redirect('/');
        return;
    }
    next();
};

// Check if user has completed onboarding
const checkOnboarding = async (req, res, next) => {
    if (!req.session.userData) {
        return next();
    }

    try {
        const [user] = await db.promise().query(
            'SELECT is_onboarded FROM users WHERE id = ?',
            [req.session.userData.id]
        );

        if (user[0] && !user[0].is_onboarded && req.path !== '/onboarding') {
            return res.redirect('/onboarding');
        }
        next();
    } catch (err) {
        console.error('Error checking onboarding status:', err);
        next();
    }
};

// Apply onboarding check to all routes except authentication routes
app.use((req, res, next) => {
    if (!['/login', '/signup', '/'].includes(req.path)) {
        checkOnboarding(req, res, next);
    } else {
        next();
    }
});

// Error logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`);
        if (res.statusCode >= 400) {
            console.error(`Error: ${res.statusCode} on ${req.method} ${req.originalUrl}`);
        }
    });
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('error', { 
        error: 'An error occurred',
        details: process.env.NODE_ENV === 'development' ? err.message : null
    });
});

// Routes
app.get('/', (req, res) => {
    res.render('index', { user: req.session.userData });
});

// Auth Routes
app.get('/login', (req, res) => {
    if (req.session.userData) {
        res.redirect('/dashboard');
        return;
    }
    res.render('auth/login', { error: null });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });

    try {
        const [users] = await db.promise().query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            console.log('Login failed: User not found -', email);
            return res.json({ success: false, error: 'Invalid credentials' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            console.log('Login failed: Invalid password -', email);
            return res.json({ success: false, error: 'Invalid credentials' });
        }

        req.session.userData = {
            id: user.id,
            email: user.email,
            fullName: user.full_name
        };

        console.log('Login successful:', email);
        res.json({ 
            success: true, 
            isOnboarded: user.is_onboarded 
        });
    } catch (err) {
        console.error('Login error:', err);
        res.json({ success: false, error: 'Error during login' });
    }
});

app.get('/signup', (req, res) => {
    if (req.session.userData) {
        res.redirect('/dashboard');
        return;
    }
    res.render('auth/signup', { error: null });
});

app.post('/signup', async (req, res) => {
    const { fullName, email, password } = req.body;
    console.log('Signup attempt:', { email, fullName });

    // Add validation
    if (!fullName || !fullName.trim()) {
        return res.json({ success: false, error: 'Full name is required' });
    }

    if (!email || !email.trim()) {
        return res.json({ success: false, error: 'Email is required' });
    }

    if (!password || password.length < 8) {
        return res.json({ success: false, error: 'Password must be at least 8 characters long' });
    }

    try {
        // Check if user already exists
        const [existingUsers] = await db.promise().query(
            'SELECT * FROM users WHERE email = ?',
            [email.trim()]
        );

        if (existingUsers.length > 0) {
            console.log('Signup failed: Email already exists -', email);
            return res.json({ success: false, error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user with trimmed values
        const [result] = await db.promise().query(
            'INSERT INTO users (full_name, email, password, is_onboarded) VALUES (?, ?, ?, ?)',
            [fullName.trim(), email.trim(), hashedPassword, false]
        );

        // Set session
        req.session.userData = {
            id: result.insertId,
            email: email.trim(),
            fullName: fullName.trim()
        };

        console.log('Signup successful:', email);
        res.json({ success: true });
    } catch (err) {
        console.error('Signup error:', err);
        res.json({ success: false, error: 'Error during signup' });
    }
});

// Onboarding Routes
app.get('/onboarding', requireAuth, async (req, res) => {
    try {
        const [user] = await db.promise().query(
            'SELECT is_onboarded FROM users WHERE id = ?',
            [req.session.userData.id]
        );
        
        if (user[0] && user[0].is_onboarded) {
            return res.redirect('/dashboard');
        }
        
        res.render('CustomOnboarding', { user: req.session.userData });
    } catch (err) {
        console.error('Error loading onboarding:', err);
        res.status(500).render('error', { error: 'Error loading onboarding page' });
    }
});

const emailService = require('./services/emailService');
const pdfService = require('./services/pdfService');

app.post('/onboarding', requireAuth, async (req, res) => {
    const userData = req.body;
    const userId = req.session.userData.id;
    
    try {
        // Save onboarding data
        await db.promise().query(
            'INSERT INTO user_details (user_id, age, gender, height, weight, fitness_goals, medical_conditions, activity_level, dietary_preferences) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, userData.age, userData.gender, userData.height, userData.weight, userData.fitnessGoals, userData.medicalConditions, userData.activityLevel, userData.dietaryPreferences]
        );
        
        // Update user as onboarded
        await db.promise().query(
            'UPDATE users SET is_onboarded = true WHERE id = ?',
            [userId]
        );

        // Generate and send assessment PDF
        const pdfBuffer = await pdfService.generateAssessmentPDF(req.session.userData, userData);
        
        // Send assessment completion email with PDF
        await emailService.sendAssessmentCompletionEmail(
            req.session.userData.email,
            req.session.userData.fullName,
            userData
        );
        
        res.json({ 
            success: true,
            redirectUrl: '/dashboard'
        });
    } catch (err) {
        console.error('Error saving onboarding data:', err);
        res.json({ 
            success: false, 
            error: 'Error saving onboarding data',
            redirectUrl: '/onboarding'
        });
    }
});

// Add route for downloading assessment PDF
app.get('/download-assessment', requireAuth, async (req, res) => {
    try {
        const [userDetails] = await db.promise().query(
            'SELECT * FROM user_details WHERE user_id = ?',
            [req.session.userData.id]
        );

        if (!userDetails[0]) {
            return res.status(404).send('Assessment not found');
        }

        const pdfBuffer = await pdfService.generateAssessmentPDF(
            req.session.userData,
            userDetails[0]
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=assessment_${Date.now()}.pdf`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('Error generating PDF:', err);
        res.status(500).send('Error generating PDF');
    }
});

app.get('/onboarding/download-pdf', (req, res) => {
    const userData = req.session.userData;
    if (!userData) {
        res.status(400).send('No user data available');
        return;
    }

    const doc = new PDFDocument();

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=user-profile.pdf');

    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(25).text('User Profile Summary', 100, 100);
    doc.fontSize(14);
    Object.entries(userData).forEach(([key, value], index) => {
        doc.text(`${key}: ${value}`, 100, 150 + (index * 20));
    });

    doc.end();
});

// Dashboard Route
app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const [user] = await db.promise().query(
            'SELECT is_onboarded FROM users WHERE id = ?',
            [req.session.userData.id]
        );

        if (!user[0] || !user[0].is_onboarded) {
            return res.redirect('/onboarding');
        }

        const [userDetails] = await db.promise().query(
            'SELECT * FROM user_details WHERE user_id = ?',
            [req.session.userData.id]
        );

        res.render('Dashboard', { 
            user: req.session.userData,
            userDetails: userDetails[0] || {}
        });
    } catch (err) {
        console.error('Error loading dashboard:', err);
        res.status(500).render('error', { error: 'Error loading dashboard' });
    }
});

// Feature Routes
app.get('/workouts', requireAuth, async (req, res) => {
    try {
        const [workouts] = await db.promise().query(
            'SELECT * FROM workouts WHERE user_id = ? ORDER BY workout_date DESC',
            [req.session.userData.id]
        );
        res.render('Workouts', { user: req.session.userData, workouts });
    } catch (err) {
        res.status(500).render('error', { error: 'Error loading workouts' });
    }
});

app.get('/nutrition', requireAuth, async (req, res) => {
    try {
        const [logs] = await db.promise().query(
            'SELECT * FROM nutrition_logs WHERE user_id = ? ORDER BY log_date DESC',
            [req.session.userData.id]
        );
        res.render('Nutrition1', { user: req.session.userData, logs });
    } catch (err) {
        res.status(500).render('error', { error: 'Error loading nutrition data' });
    }
});

app.get('/health-metrics', requireAuth, async (req, res) => {
    try {
        const [metrics] = await db.promise().query(
            'SELECT * FROM health_metrics WHERE user_id = ? ORDER BY record_date DESC',
            [req.session.userData.id]
        );
        res.render('HealthMetrics1', { user: req.session.userData, metrics });
    } catch (err) {
        res.status(500).render('error', { error: 'Error loading health metrics' });
    }
});

app.get('/meal-suggestions', requireAuth, (req, res) => {
    res.render('AIMealSuggestions', { user: req.session.userData });
});

app.get('/google-fit', requireAuth, (req, res) => {
    res.render('GoogleFitIntegration', { user: req.session.userData });
});

app.get('/doctor-consult', requireAuth, (req, res) => {
    res.render('DoctorConsult1', { user: req.session.userData });
});

app.get('/settings', requireAuth, (req, res) => {
    res.render('settings', { user: req.session.userData });
});

app.get('/alerts', requireAuth, (req, res) => {
    res.render('Alerts1', { user: req.session.userData });
});

app.get('/food-analysis', requireAuth, (req, res) => {
    res.render('FoodAnalysis1', { user: req.session.userData });
});

app.get('/live-tracking', requireAuth, (req, res) => {
    res.render('LiveTracking1', { user: req.session.userData });
});

app.get('/community', requireAuth, (req, res) => {
    res.render('community', { user: req.session.userData });
});

app.get('/schedule', requireAuth, (req, res) => {
    res.render('schedule1', { user: req.session.userData });
});

app.get('/progress', requireAuth, (req, res) => {
    res.render('progress1', { user: req.session.userData });
});

// API endpoints for dynamic data
app.get('/api/user-progress', (req, res) => {
    const userId = req.session.userData?.id;
    if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
    }

    const query = 'SELECT * FROM user_progress WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
        }
        res.json(results);
    });
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Download user details
app.get('/download-details', requireAuth, async (req, res) => {
    try {
        const [userDetails] = await db.promise().query(
            `SELECT u.full_name, u.email, ud.* 
             FROM users u 
             LEFT JOIN user_details ud ON u.id = ud.user_id 
             WHERE u.id = ?`,
            [req.session.userData.id]
        );

        if (!userDetails[0]) {
            return res.status(404).json({ error: 'User details not found' });
        }

        const doc = new PDFDocument();
        const filename = `user_details_${Date.now()}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        doc.pipe(res);

        // Add content to PDF
        doc.fontSize(20).text('Your FitWit AI Profile', { align: 'center' });
        doc.moveDown();
        
        const details = userDetails[0];
        doc.fontSize(12);
        Object.entries(details).forEach(([key, value]) => {
            if (key !== 'user_id' && key !== 'id' && value) {
                doc.text(`${key.replace(/_/g, ' ').toUpperCase()}: ${value}`);
                doc.moveDown(0.5);
            }
        });

        doc.end();
    } catch (err) {
        console.error('Error generating PDF:', err);
        res.status(500).json({ error: 'Error generating PDF' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 