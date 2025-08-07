// Delhi Water Monitoring Dashboard - Enhanced JavaScript

// Global variables
let socket;
let selectedWaterBody = null;
let charts = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Delhi Water Monitoring Dashboard...');
    
    // Add loading animation
    addLoadingAnimation();
    
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Load initial data
    loadWaterBodies();
    loadAlerts();
    
    // Initialize charts
    initializeCharts();
    
    // Add particle effects
    createParticleEffects();
    
    // Add scroll animations
    addScrollAnimations();
    
    // Add interactive elements
    addInteractiveElements();
    
    console.log('✅ Dashboard initialized successfully!');
});

// Add loading animation
function addLoadingAnimation() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Initialize WebSocket connection
function initializeWebSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('🔌 WebSocket connected');
        updateConnectionStatus(true);
    });
    
    socket.on('disconnect', function() {
        console.log('🔌 WebSocket disconnected');
        updateConnectionStatus(false);
    });
    
    socket.on('sensor_data', function(data) {
        console.log('📊 Received sensor data:', data);
        updateSensorData(data);
        updateCharts(data);
    });
}

// Update connection status
function updateConnectionStatus(connected) {
    const statusElement = document.createElement('div');
    statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    statusElement.innerHTML = `
        <span class="status-dot ${connected ? 'online' : 'offline'}"></span>
        ${connected ? 'Connected' : 'Disconnected'}
    `;
    
    // Remove existing status
    const existingStatus = document.querySelector('.connection-status');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    // Add to navbar
    const navbar = document.querySelector('.navbar-nav');
    navbar.appendChild(statusElement);
}

// Load water bodies
async function loadWaterBodies() {
    try {
        const response = await fetch('/api/water-bodies');
        const waterBodies = await response.json();
        
        const container = document.getElementById('water-bodies-list');
        container.innerHTML = '';
        
        waterBodies.forEach((body, index) => {
            const item = createWaterBodyItem(body);
            item.style.animationDelay = `${index * 0.1}s`;
            container.appendChild(item);
        });
        
        // Update summary
        updateSummary(waterBodies.length);
        
    } catch (error) {
        console.error('❌ Error loading water bodies:', error);
        showNotification('Error loading water bodies', 'error');
    }
}

// Create water body item with enhanced styling
function createWaterBodyItem(body) {
    const item = document.createElement('div');
    item.className = 'water-body-item interactive-card fade-in';
    item.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <span class="status-indicator ${getQualityStatus(body)}"></span>
                <strong>${body.name}</strong>
                <br>
                <small class="text-muted">Area: ${body.area} sq km</small>
            </div>
            <div class="text-end">
                <i class="fas fa-chevron-right"></i>
            </div>
        </div>
    `;
    
    item.addEventListener('click', () => selectWaterBody(body.id));
    return item;
}

// Get quality status based on water body data
function getQualityStatus(body) {
    // Simulate quality based on random factors
    const quality = Math.random();
    if (quality > 0.7) return 'good';
    if (quality > 0.4) return 'fair';
    return 'poor';
}

// Select water body
function selectWaterBody(id) {
    selectedWaterBody = id;
    
    // Update UI
    document.querySelectorAll('.water-body-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    event.currentTarget.classList.add('selected');
    
    // Load sensor data
    loadSensorData(id);
    
    // Add selection animation
    event.currentTarget.style.animation = 'bounce-in 0.6s ease-out';
    setTimeout(() => {
        event.currentTarget.style.animation = '';
    }, 600);
}

// Load sensor data
async function loadSensorData(waterBodyId) {
    try {
        const response = await fetch(`/api/sensor-data/${waterBodyId}`);
        const data = await response.json();
        
        updateSensorDisplay(data.current);
        updateCharts(data.historical);
        
        // Show sensor data section
        document.getElementById('selected-water-body').style.display = 'none';
        document.getElementById('sensor-data').style.display = 'block';
        
        // Add reveal animation
        const sensorData = document.getElementById('sensor-data');
        sensorData.style.animation = 'slide-in 0.4s ease-out';
        
    } catch (error) {
        console.error('❌ Error loading sensor data:', error);
        showNotification('Error loading sensor data', 'error');
    }
}

// Update sensor display with animations
function updateSensorDisplay(data) {
    const sensors = ['ph', 'temperature', 'oxygen', 'turbidity', 'conductivity', 'tds'];
    
    sensors.forEach(sensor => {
        const element = document.getElementById(`${sensor}-value`);
        if (element && data[sensor]) {
            // Animate value change
            const oldValue = parseFloat(element.textContent) || 0;
            const newValue = parseFloat(data[sensor]);
            
            animateValue(element, oldValue, newValue, 1000);
        }
    });
}

// Animate value changes
function animateValue(element, start, end, duration) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = start + (end - start) * easeOutCubic(progress);
        element.textContent = current.toFixed(2);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Easing function
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// Update charts with new data
function updateCharts(data) {
    if (!data || !Array.isArray(data)) return;
    
    // Update pH chart
    if (charts.phChart) {
        const phData = data.map(item => item.ph).reverse();
        const labels = data.map((_, index) => `${24 - index}h`).reverse();
        
        charts.phChart.data.labels = labels;
        charts.phChart.data.datasets[0].data = phData;
        charts.phChart.update('active');
    }
    
    // Update temperature chart
    if (charts.temperatureChart) {
        const tempData = data.map(item => item.temperature).reverse();
        const labels = data.map((_, index) => `${24 - index}h`).reverse();
        
        charts.temperatureChart.data.labels = labels;
        charts.temperatureChart.data.datasets[0].data = tempData;
        charts.temperatureChart.update('active');
    }
}

// Initialize charts with modern styling
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                    font: {
                        family: 'Inter, sans-serif',
                        weight: '600'
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                    font: {
                        family: 'Inter, sans-serif'
                    }
                },
                grid: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--border-color'),
                    drawBorder: false
                }
            },
            y: {
                ticks: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                    font: {
                        family: 'Inter, sans-serif'
                    }
                },
                grid: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--border-color'),
                    drawBorder: false
                }
            }
        }
    };
    
    // pH Chart
    const phCtx = document.getElementById('phChart');
    if (phCtx) {
        charts.phChart = new Chart(phCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'pH Level',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg'),
                        titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                        bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color'),
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                }
            }
        });
    }
    
    // Temperature Chart
    const tempCtx = document.getElementById('temperatureChart');
    if (tempCtx) {
        charts.temperatureChart = new Chart(tempCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg'),
                        titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                        bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color'),
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                }
            }
        });
    }
}

// Load alerts with animations
async function loadAlerts() {
    try {
        const response = await fetch('/api/alerts');
        const alerts = await response.json();
        
        const container = document.getElementById('alerts-container');
        container.innerHTML = '';
        
        alerts.forEach((alert, index) => {
            const alertElement = createAlertElement(alert);
            alertElement.style.animationDelay = `${index * 0.1}s`;
            container.appendChild(alertElement);
        });
        
        // Update alert count
        document.getElementById('active-alerts').textContent = alerts.length;
        
    } catch (error) {
        console.error('❌ Error loading alerts:', error);
        showNotification('Error loading alerts', 'error');
    }
}

// Create alert element with enhanced styling
function createAlertElement(alert) {
    const element = document.createElement('div');
    element.className = `alert-item ${alert.severity} fade-in`;
    element.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
            <div>
                <strong>${alert.type}</strong>
                <br>
                <small>${alert.water_body}</small>
                <br>
                <span class="text-muted">${alert.message}</span>
            </div>
            <div class="text-end">
                <small class="text-muted">${formatTime(alert.timestamp)}</small>
                <br>
                <span class="quality-badge ${alert.severity}">${alert.severity}</span>
            </div>
        </div>
    `;
    
    return element;
}

// Update summary with animations
function updateSummary(totalBodies) {
    const elements = {
        'total-bodies': totalBodies,
        'good-quality': Math.floor(totalBodies * 0.7),
        'active-alerts': Math.floor(totalBodies * 0.2)
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            animateValue(element, 0, value, 1500);
        }
    });
}

// Update sensor data from WebSocket
function updateSensorData(data) {
    if (!selectedWaterBody || data.water_body_id !== selectedWaterBody) return;
    
    // Update sensor values with animations
    const sensors = {
        'ph-value': data.ph,
        'temperature-value': data.temperature,
        'oxygen-value': data.dissolved_oxygen,
        'turbidity-value': data.turbidity,
        'conductivity-value': data.conductivity,
        'tds-value': data.total_dissolved_solids
    };
    
    Object.entries(sensors).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value !== undefined) {
            const currentValue = parseFloat(element.textContent) || 0;
            animateValue(element, currentValue, value, 800);
        }
    });
    
    // Update last updated time
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
        lastUpdated.textContent = 'Just now';
        lastUpdated.style.animation = 'pulse 0.6s ease-out';
        setTimeout(() => {
            lastUpdated.style.animation = '';
        }, 600);
    }
}

// Create particle effects
function createParticleEffects() {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    document.body.appendChild(particlesContainer);
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
        particlesContainer.appendChild(particle);
    }
}

// Add scroll animations
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.card').forEach(card => {
        observer.observe(card);
    });
}

// Add interactive elements
function addInteractiveElements() {
    // Add hover effects to cards
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Add click effects to buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} fade-in`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Format time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
}

// Add CSS for new animations
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        padding: 1rem;
        box-shadow: var(--box-shadow);
        z-index: 1000;
        backdrop-filter: blur(20px);
        max-width: 300px;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .notification-error {
        border-left: 4px solid #ef4444;
    }
    
    .notification-info {
        border-left: 4px solid #3b82f6;
    }
    
    .fade-out {
        animation: fadeOut 0.3s ease-out forwards;
    }
    
    @keyframes fadeOut {
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .connection-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
    }
    
    .connection-status.connected {
        color: #10b981;
    }
    
    .connection-status.disconnected {
        color: #ef4444;
    }
`;

document.head.appendChild(style); 