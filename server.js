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

// Basic error handler for views
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (err.code === 'ENOENT' && err.message.includes('.ejs')) {
        return res.status(404).json({ error: 'View not found' });
    }
    next(err);
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
                fullName: "Test User"
            };
            res.json({ success: true, isOnboarded: true });
        } else {
            res.json({ success: false, error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
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