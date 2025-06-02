// Handle signup form submission
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.querySelector('form');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const formData = {
                    fullName: this.querySelector('input[name="fullName"]').value,
                    email: this.querySelector('input[name="email"]').value,
                    password: this.querySelector('input[name="password"]').value
                };

                console.log('Submitting signup form...');
                
                const response = await fetch('/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData),
                    credentials: 'include' // Important for cross-origin requests
                });

                const data = await response.json();
                console.log('Signup response:', data);

                if (data.success) {
                    // Verify session immediately after signup
                    try {
                        const sessionResponse = await fetch('/debug-session', {
                            credentials: 'include'
                        });
                        const sessionData = await sessionResponse.json();
                        console.log('Session debug:', sessionData);

                        if (sessionData.userData) {
                            console.log('Session verified, redirecting to:', data.redirectTo);
                            window.location.href = data.redirectTo;
                        } else {
                            console.error('Session not created properly');
                            alert('Error: Session not created. Please try again.');
                        }
                    } catch (sessionError) {
                        console.error('Session verification error:', sessionError);
                        // Still try to redirect
                        window.location.href = data.redirectTo;
                    }
                } else {
                    console.error('Signup failed:', data.error);
                    alert(data.error || 'Error during signup');
                }
            } catch (error) {
                console.error('Signup error:', error);
                alert('Error during signup. Please try again.');
            }
        });
    }
}); 