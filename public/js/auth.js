// Handle form navigation
let currentStep = 1;
const totalSteps = 8;

function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const currentStepSpan = document.getElementById('currentStep');
    const stepTitle = document.getElementById('stepTitle');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    if (progressFill) {
        progressFill.style.width = `${(currentStep / totalSteps) * 100}%`;
    }
    if (currentStepSpan) {
        currentStepSpan.textContent = currentStep;
    }

    // Update navigation buttons visibility
    if (prevBtn) {
        prevBtn.style.display = currentStep > 1 ? 'block' : 'none';
    }
    if (nextBtn) {
        nextBtn.style.display = currentStep < totalSteps ? 'block' : 'none';
    }
    if (submitBtn) {
        submitBtn.style.display = currentStep === totalSteps ? 'block' : 'none';
    }

    // Update step indicators
    document.querySelectorAll('.step').forEach((step, index) => {
        if (index + 1 < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (index + 1 === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });

    // Show current step, hide others
    document.querySelectorAll('.form-step').forEach(step => {
        if (parseInt(step.dataset.step) === currentStep) {
            step.classList.remove('hidden');
        } else {
            step.classList.add('hidden');
        }
    });
}

// Handle next step
function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        updateProgress();
    }
}

// Handle previous step
function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateProgress();
    }
}

// Initialize progress
document.addEventListener('DOMContentLoaded', () => {
    updateProgress();

    // Add event listeners to navigation buttons
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (nextBtn) {
        nextBtn.addEventListener('click', nextStep);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', prevStep);
    }

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
                window.location.href = data.redirectTo;
            } else {
                alert(data.error || 'Signup failed');
                if (data.redirectTo) {
                    window.location.href = data.redirectTo;
                }
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert('An error occurred during signup');
            window.location.href = '/';
        }
    });

    // Handle final onboarding submission
    document.querySelector('.btn-submit')?.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
            // Gather all form data
            const formData = {
                firstName: document.getElementById('firstName')?.value,
                lastName: document.getElementById('lastName')?.value,
                age: document.getElementById('age')?.value,
                gender: document.getElementById('gender')?.value,
                height: document.getElementById('height')?.value,
                weight: document.getElementById('weight')?.value,
                occupation: document.getElementById('occupation')?.value,
                email: document.getElementById('email')?.value,
                phone: document.getElementById('phone')?.value,
                targetWeight: document.getElementById('targetWeight')?.value,
                bodyType: document.getElementById('bodyType')?.value,
                fitnessGoals: document.querySelector('[data-field="fitnessLevel"] .rating-item.selected')?.dataset.value,
                medicalConditions: Array.from(document.querySelectorAll('[data-field="medicalConditions"] .condition-item.selected')).map(item => item.dataset.value),
                medications: document.getElementById('medications')?.value,
                allergies: document.getElementById('allergies')?.value
            };

            console.log('Submitting onboarding data:', formData);

            const response = await fetch('/custom-onboarding', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            console.log('Server response:', data);
            
            if (data.success) {
                // Show completion message
                document.querySelector('.completion-screen')?.classList.remove('hidden');
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = data.redirectTo;
                }, 2000);
            } else {
                alert(data.error || 'Onboarding failed');
                if (data.redirectTo) {
                    window.location.href = data.redirectTo;
                }
            }
        } catch (error) {
            console.error('Onboarding error:', error);
            alert('An error occurred during onboarding');
            window.location.href = '/';
        }
    });
}); 