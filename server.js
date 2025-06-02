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

// Basic Auth Routes (without DB)
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    // For testing purposes
    if (email === "test@example.com" && password === "password") {
        req.session.userData = {
            id: 1,
            email: email,
            fullName: "Test User"
        };
        res.json({ success: true, isOnboarded: true });
    } else {
        res.json({ success: false, error: 'Invalid credentials' });
    }
});

app.post('/signup', (req, res) => {
    const { fullName, email, password } = req.body;
    // For testing purposes
    req.session.userData = {
        id: 1,
        email: email,
        fullName: fullName
    };
    res.json({ success: true });
});

// Dashboard Route
app.get('/dashboard', requireAuth, (req, res) => {
    res.render('Dashboard', { 
        user: req.session.userData,
        userDetails: {
            age: 25,
            gender: "Not specified",
            height: "170cm",
            weight: "70kg",
            fitnessGoals: "Stay healthy",
            activityLevel: "Moderate"
        }
    });
});

// Feature Routes
app.get('/workouts', requireAuth, (req, res) => {
    res.render('Workouts', { 
        user: req.session.userData, 
        workouts: [] 
    });
});

app.get('/nutrition', requireAuth, (req, res) => {
    res.render('Nutrition1', { 
        user: req.session.userData, 
        logs: [] 
    });
});

app.get('/health-metrics', requireAuth, (req, res) => {
    res.render('HealthMetrics1', { 
        user: req.session.userData, 
        metrics: [] 
    });
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

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 