document.addEventListener('DOMContentLoaded', function() {
    const sendNutritionReport = document.getElementById('sendNutritionReport');
    
    if (sendNutritionReport) {
        sendNutritionReport.addEventListener('click', async function() {
            try {
                // Disable button and show loading state
                this.disabled = true;
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

                // Gather nutrition data
                const nutritionData = {
                    calories: {
                        current: document.querySelector('.calories .stat-current').textContent,
                        target: document.querySelector('.calories .stat-target').textContent.split('/')[1].trim()
                    },
                    protein: {
                        current: document.querySelector('.protein .stat-current').textContent,
                        target: document.querySelector('.protein .stat-target').textContent.split('/')[1].trim()
                    },
                    carbs: {
                        current: document.querySelector('.carbs .stat-current').textContent,
                        target: document.querySelector('.carbs .stat-target').textContent.split('/')[1].trim()
                    },
                    fats: {
                        current: document.querySelector('.fats .stat-current').textContent,
                        target: document.querySelector('.fats .stat-target').textContent.split('/')[1].trim()
                    },
                    meals: {}
                };

                // Gather meals data
                document.querySelectorAll('.meal-card').forEach(card => {
                    const title = card.querySelector('.meal-title').textContent;
                    const items = Array.from(card.querySelectorAll('.meal-item')).map(item => item.textContent);
                    nutritionData.meals[title] = items;
                });

                // Send data to server
                const response = await fetch('/api/send-nutrition-report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(nutritionData)
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('Success', 'Nutrition report sent successfully!', 'success');
                } else {
                    throw new Error(result.message || 'Failed to send report');
                }
            } catch (error) {
                console.error('Error sending nutrition report:', error);
                showNotification('Error', 'Failed to send nutrition report. Please try again.', 'error');
            } finally {
                // Restore button state
                this.disabled = false;
                this.innerHTML = originalText;
            }
        });
    }

    // Notification function
    function showNotification(title, message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
            <button class="notification-close">&times;</button>
        `;

        document.body.appendChild(notification);

        // Add show class after a small delay for animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);

        // Close button functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
    }
}); 