// Main JavaScript for Data Analysis Platform
// Handles UI interactions, form validation, and user experience enhancements

document.addEventListener('DOMContentLoaded', function() {
    console.log('DataAnalyzer Mobile App - Main JS Loaded');
    
    // Initialize mobile app features
    initializeMobileApp();
    
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize form validation
    initializeFormValidation();
    
    // Initialize UI enhancements
    initializeUIEnhancements();
    
    // Initialize number formatting
    initializeNumberFormatting();
    
    // Initialize chart interactions
    initializeChartInteractions();
    
    // Initialize mobile toasts
    initializeMobileToasts();
    
    // Update time
    updateTime();
    
    // Set initial back button state
    updateBackButton();
});

/**
 * Initialize Bootstrap tooltips
 */
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Initialize form validation and enhancement
 */
function initializeFormValidation() {
    // Add Bootstrap validation classes to forms
    const forms = document.querySelectorAll('.needs-validation');
    
    Array.prototype.slice.call(forms).forEach(function(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
    
    // Real-time validation for file uploads
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(function(input) {
        input.addEventListener('change', function(e) {
            validateFileInput(e.target);
        });
    });
}

/**
 * Validate file input
 */
function validateFileInput(input) {
    const file = input.files[0];
    const maxSize = 16 * 1024 * 1024; // 16MB
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    
    if (!file) return;
    
    // Check file size
    if (file.size > maxSize) {
        showAlert('File size must be less than 16MB', 'danger');
        input.value = '';
        return false;
    }
    
    // Check file type
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedTypes.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
        showAlert('Please select a CSV or Excel file (.csv, .xlsx, .xls)', 'danger');
        input.value = '';
        return false;
    }
    
    return true;
}

/**
 * Initialize UI enhancements
 */
function initializeUIEnhancements() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        if (!alert.querySelector('.btn-close')) {
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.style.opacity = '0';
                    setTimeout(() => {
                        if (alert.parentNode) {
                            alert.remove();
                        }
                    }, 300);
                }
            }, 5000);
        }
    });
    
    // Add loading states to buttons
    const loadingButtons = document.querySelectorAll('[data-loading-text]');
    loadingButtons.forEach(button => {
        button.addEventListener('click', function() {
            setButtonLoading(this, true);
        });
    });
    
    // Initialize card hover effects
    initializeCardHoverEffects();
    
    // Initialize copy to clipboard functionality
    initializeCopyToClipboard();
}

/**
 * Initialize card hover effects
 */
function initializeCardHoverEffects() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

/**
 * Initialize copy to clipboard functionality
 */
function initializeCopyToClipboard() {
    const copyButtons = document.querySelectorAll('[data-copy]');
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const textToCopy = this.getAttribute('data-copy');
            copyToClipboard(textToCopy);
        });
    });
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showAlert('Copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            showAlert('Failed to copy to clipboard', 'danger');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showAlert('Copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy: ', err);
            showAlert('Failed to copy to clipboard', 'danger');
        }
        document.body.removeChild(textArea);
    }
}

/**
 * Initialize number formatting
 */
function initializeNumberFormatting() {
    const numberElements = document.querySelectorAll('[data-format="number"]');
    numberElements.forEach(element => {
        const number = parseInt(element.textContent);
        if (!isNaN(number)) {
            element.textContent = number.toLocaleString();
        }
    });
}

/**
 * Initialize chart interactions
 */
function initializeChartInteractions() {
    // Auto-resize charts on window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if (typeof Plotly !== 'undefined') {
                const charts = document.querySelectorAll('.plotly-graph-div');
                charts.forEach(chart => {
                    Plotly.Plots.resize(chart);
                });
            }
        }, 100);
    });
    
    // Add loading states to chart generation
    const chartForms = document.querySelectorAll('#chart-form');
    chartForms.forEach(form => {
        form.addEventListener('submit', function() {
            showChartLoading(true);
        });
    });
}

/**
 * Show/hide chart loading state
 */
function showChartLoading(show) {
    const loadingOverlay = document.getElementById('chart-loading');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Set button loading state
 */
function setButtonLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        const loadingText = button.getAttribute('data-loading-text') || 'Loading...';
        button.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i>${loadingText}`;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info', duration = 5000) {
    showInlineNotification(message, type, duration);
}

function showInlineNotification(message, type = 'info', duration = 5000) {
    const notificationArea = document.getElementById('notification-area');
    const notificationMessage = document.getElementById('notification-message');
    const notificationText = document.getElementById('notification-text');
    const notificationIcon = document.getElementById('notification-icon');
    
    if (!notificationArea || !notificationMessage || !notificationText || !notificationIcon) return;
    
    // Set the alert type and icon
    notificationMessage.className = `alert alert-${type} alert-dismissible fade show`;
    notificationIcon.className = `fas fa-${getAlertIcon(type)} me-2`;
    notificationText.textContent = message;
    
    // Show notification
    notificationArea.style.display = 'block';
    notificationArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto-hide after duration
    if (duration > 0) {
        setTimeout(() => {
            hideNotification();
        }, duration);
    }
}

function hideNotification() {
    const notificationArea = document.getElementById('notification-area');
    if (notificationArea) {
        notificationArea.style.display = 'none';
    }
}

/**
 * Get appropriate icon for alert type
 */
function getAlertIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-triangle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle',
        'primary': 'info-circle',
        'secondary': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format numbers with locale-specific formatting
 */
function formatNumber(number, decimals = 0) {
    return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}

/**
 * Debounce function to limit rate of function calls
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func.apply(context, args);
    };
}

/**
 * Check if element is in viewport
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Animate elements on scroll
 */
function initializeScrollAnimations() {
    const animatedElements = document.querySelectorAll('.fade-in-up');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

/**
 * Initialize keyboard shortcuts
 */
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+U or Cmd+U for upload page
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            window.location.href = '/upload';
        }
        
        // Ctrl+D or Cmd+D for dashboard
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            const dashboardLink = document.querySelector('a[href*="dashboard"]');
            if (dashboardLink) {
                window.location.href = dashboardLink.getAttribute('href');
            }
        }
        
        // Escape key to close modals and alerts
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal.show');
            modals.forEach(modal => {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();
            });
            
            const alerts = document.querySelectorAll('.alert .btn-close');
            if (alerts.length > 0) {
                alerts[0].click();
            }
        }
    });
}

/**
 * Export functions for global use
 */
window.DataAnalysisPlatform = {
    showAlert,
    formatFileSize,
    formatNumber,
    setButtonLoading,
    copyToClipboard,
    debounce,
    isInViewport
};

// Initialize keyboard shortcuts and scroll animations
document.addEventListener('DOMContentLoaded', function() {
    initializeKeyboardShortcuts();
    initializeScrollAnimations();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Page hidden - pausing animations');
    } else {
        console.log('Page visible - resuming animations');
    }
});

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', function() {
        setTimeout(function() {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
        }, 0);
    });
}

/**
 * Initialize mobile app features
 */
function initializeMobileApp() {
    // Set viewport height for mobile browsers
    const setViewportHeight = () => {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    
    // Prevent pull-to-refresh on mobile
    document.body.addEventListener('touchmove', function(e) {
        if (e.target === document.body) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Add haptic feedback for buttons (mobile only)
    const buttons = document.querySelectorAll('button, .btn, .nav-item');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
        });
    });
    
    // Handle active states for mobile
    document.addEventListener('touchstart', function() {}, { passive: true });
}

/**
 * Update back button visibility
 */
function updateBackButton() {
    const backBtn = document.querySelector('.btn-back');
    if (backBtn) {
        const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index';
        const hasHistory = window.history.length > 1;
        
        if (!isHomePage && hasHistory) {
            backBtn.style.display = 'block';
        } else {
            backBtn.style.display = 'none';
        }
    }
}

/**
 * Update time in status bar
 */
function updateTime() {
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        timeElement.textContent = timeString;
    }
}

// Update time every minute
setInterval(updateTime, 60000);

/**
 * Initialize mobile toasts
 */
function initializeMobileToasts() {
    const toasts = document.querySelectorAll('.mobile-toast');
    toasts.forEach((toast, index) => {
        // Auto-hide after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000 + (index * 500));
    });
}

/**
 * Show mobile toast
 */
function showMobileToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `mobile-toast toast-${type}`;
    
    const icon = getToastIcon(type);
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

/**
 * Get toast icon
 */
function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-triangle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Add slideUp animation CSS if not exists
if (!document.querySelector('#mobile-animations')) {
    const style = document.createElement('style');
    style.id = 'mobile-animations';
    style.textContent = `
        @keyframes slideUp {
            from {
                transform: translateY(0);
                opacity: 1;
            }
            to {
                transform: translateY(-100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}
