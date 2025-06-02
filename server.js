const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Production-ready session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userData) {
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
        res.render('index', { user: req.session.userData });
    } catch (error) {
        console.error('Error rendering index:', error);
        res.status(500).json({ error: 'Error rendering page' });
    }
});

// Basic Auth Routes (without DB)
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
            res.json({ success: true, isOnboarded: false });
        } else {
            res.json({ success: false, error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/signup', (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        // For testing purposes
        req.session.userData = {
            id: 1,
            email: email,
            fullName: fullName,
            isOnboarded: false
        };
        res.json({ success: true, isOnboarded: false });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Onboarding Routes
app.get('/onboarding', requireAuth, (req, res) => {
    try {
        if (req.session.userData.isOnboarded) {
            return res.redirect('/dashboard');
        }
        res.render('onboarding', { user: req.session.userData });
    } catch (error) {
        console.error('Onboarding error:', error);
        res.status(500).json({ error: 'Error rendering onboarding page' });
    }
});

app.post('/onboarding', requireAuth, (req, res) => {
    try {
        const { age, gender, height, weight, fitnessGoals, activityLevel } = req.body;
        req.session.userData = {
            ...req.session.userData,
            isOnboarded: true,
            userDetails: {
                age,
                gender,
                height,
                weight,
                fitnessGoals,
                activityLevel
            }
        };
        res.json({ success: true });
    } catch (error) {
        console.error('Onboarding save error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Protected Routes
app.get('/dashboard', requireAuth, (req, res) => {
    try {
        if (!req.session.userData.isOnboarded) {
            return res.redirect('/onboarding');
        }
        res.render('dashboard', {
            user: req.session.userData,
            userDetails: req.session.userData.userDetails || {
                age: 25,
                gender: "Not specified",
                height: "170cm",
                weight: "70kg",
                fitnessGoals: "Stay healthy",
                activityLevel: "Moderate"
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Error rendering dashboard' });
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ 
        error: 'An error occurred',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// Start server with error handling
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
}); 