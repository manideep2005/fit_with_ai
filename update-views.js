const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');

// List of view files to update
const viewFiles = [
    'Dashboard.ejs',
    'LiveTracking1.ejs',
    'HealthMetrics1.ejs',
    'Workouts.ejs',
    'Nutrition1.ejs',
    'FoodAnalysis1.ejs',
    'DoctorConsult1.ejs',
    'Alerts1.ejs',
    'community.ejs',
    'settings.ejs',
    'progress1.ejs',
    'schedule1.ejs'
];

// Function to get the current page name from filename
function getCurrentPage(filename) {
    const name = filename.replace('.ejs', '').toLowerCase();
    return name === 'dashboard' ? 'dashboard' :
           name === 'livetracking1' ? 'live-tracking' :
           name === 'healthmetrics1' ? 'health-metrics' :
           name === 'workouts' ? 'workouts' :
           name === 'nutrition1' ? 'nutrition' :
           name === 'foodanalysis1' ? 'food-analysis' :
           name === 'doctorconsult1' ? 'doctor-consult' :
           name === 'alerts1' ? 'alerts' :
           name === 'community' ? 'community' :
           name === 'settings' ? 'settings' :
           name === 'progress1' ? 'progress' :
           name === 'schedule1' ? 'schedule' :
           name;
}

// Update each view file
viewFiles.forEach(filename => {
    const filePath = path.join(viewsDir, filename);
    
    // Skip if file doesn't exist
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${filename} - file not found`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Replace navigation section
    content = content.replace(
        /<aside[^>]*>[\s\S]*?<\/aside>/,
        `<aside class="sidebar">
            <%- include('partials/navigation', { currentPage: '${getCurrentPage(filename)}' }) %>
        </aside>`
    );

    // Replace .html references in hrefs
    content = content.replace(/href="([^"]+)\.html"/g, (match, p1) => {
        const route = p1.toLowerCase();
        return `href="/${route}"`;
    });

    // Replace .html references in JavaScript
    content = content.replace(/\.html/g, '');

    // Write updated content back to file
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filename}`);
});

console.log('All view files have been updated!'); 