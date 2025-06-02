// Handle login form submission
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: document.getElementById('loginEmail').value,
                password: document.getElementById('loginPassword').value
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Redirect to the specified route
            window.location.href = data.redirectTo;
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login');
    }
});

// Handle signup form submission
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fullName: document.getElementById('signupName').value,
                email: document.getElementById('signupEmail').value,
                password: document.getElementById('signupPassword').value
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Redirect to the specified route
            window.location.href = data.redirectTo;
        } else {
            alert(data.error || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('An error occurred during signup');
    }
});

// Handle onboarding form submission
document.getElementById('CustomOnboardingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const response = await fetch('/CustomOnboarding', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                age: document.getElementById('age').value,
                gender: document.getElementById('gender').value,
                height: document.getElementById('height').value,
                weight: document.getElementById('weight').value,
                fitnessGoals: document.getElementById('fitnessGoals').value,
                activityLevel: document.getElementById('activityLevel').value
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Redirect to the specified route
            window.location.href = data.redirectTo;
        } else {
            alert(data.error || 'Onboarding failed');
        }
    } catch (error) {
        console.error('Onboarding error:', error);
        alert('An error occurred during onboarding');
    }
}); 