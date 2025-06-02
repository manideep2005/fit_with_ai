document.addEventListener('DOMContentLoaded', function() {
    // Form steps functionality
    const formSteps = document.querySelectorAll('.form-step');
    const formPanels = document.querySelectorAll('.form-panel');
    const btnNext = document.querySelectorAll('.btn-next');
    const btnPrev = document.querySelectorAll('.btn-prev');
    let currentStep = 0;

    function showStep(step) {
        formPanels.forEach(panel => panel.classList.remove('active'));
        formSteps.forEach(step => step.classList.remove('active'));
        
        formPanels[step].classList.add('active');
        formSteps[step].classList.add('active');
        currentStep = step;
    }

    btnNext.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep < formSteps.length - 1) {
                showStep(currentStep + 1);
            }
        });
    });

    btnPrev.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 0) {
                showStep(currentStep - 1);
            }
        });
    });

    // Initialize first step
    showStep(0);

    // Fitness Goals Selection
    const goalItems = document.querySelectorAll('.goal-item');
    goalItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all goals
            goalItems.forEach(g => g.classList.remove('active'));
            // Add active class to clicked goal
            this.classList.add('active');
        });
    });

    // Target Areas Selection
    const fullBodyCheckbox = document.getElementById('area-full-body');
    const otherAreaCheckboxes = document.querySelectorAll('.form-check-input:not(#area-full-body)');

    // When Full Body is selected, uncheck other options
    if (fullBodyCheckbox) {
        fullBodyCheckbox.addEventListener('change', function() {
            if (this.checked) {
                otherAreaCheckboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
            }
        });
    }

    // When other options are selected, uncheck Full Body
    otherAreaCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked && fullBodyCheckbox) {
                fullBodyCheckbox.checked = false;
            }
        });
    });

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const workoutCards = document.querySelectorAll('.workout-card');
            
            workoutCards.forEach(card => {
                const title = card.querySelector('.workout-day').textContent.toLowerCase();
                const focus = card.querySelector('.workout-focus').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || focus.includes(searchTerm)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // Export PDF functionality
    const exportBtn = document.querySelector('.export-pdf-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            const element = document.querySelector('.plan-container');
            const opt = {
                margin: 1,
                filename: 'workout-plan.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(element).save();
        });
    }

    // Exercise video modal
    const videoLinks = document.querySelectorAll('.exercise-video');
    const videoModal = document.querySelector('.video-modal');
    const closeVideo = document.querySelector('.close-video');

    if (videoLinks && videoModal) {
        videoLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const videoTitle = this.getAttribute('data-title');
                const videoUrl = this.getAttribute('data-url');
                
                const videoTitleEl = videoModal.querySelector('.video-title');
                const videoEl = videoModal.querySelector('video');
                
                if (videoTitleEl) videoTitleEl.textContent = videoTitle;
                if (videoEl) videoEl.src = videoUrl;
                
                videoModal.style.display = 'block';
            });
        });

        if (closeVideo) {
            closeVideo.addEventListener('click', () => {
                const videoEl = videoModal.querySelector('video');
                if (videoEl) videoEl.pause();
                videoModal.style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === videoModal) {
                const videoEl = videoModal.querySelector('video');
                if (videoEl) videoEl.pause();
                videoModal.style.display = 'none';
            }
        });
    }

    // Exercise checkboxes
    const exerciseChecks = document.querySelectorAll('.exercise-check');
    if (exerciseChecks) {
        exerciseChecks.forEach(check => {
            check.addEventListener('change', function() {
                const exerciseItem = this.closest('.exercise-item');
                if (this.checked) {
                    exerciseItem.style.opacity = '0.5';
                } else {
                    exerciseItem.style.opacity = '1';
                }
            });
        });
    }
}); 