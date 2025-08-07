// Delhi Water Monitoring Analytics JavaScript

// Global variables
let charts = {};
let analyticsData = {};
let waterBodiesData = [];
let socket;

// Initialize analytics
document.addEventListener('DOMContentLoaded', function() {
    initializeSocket();
    loadAnalyticsData();
    loadWaterBodies();
    initializeCharts();
    setupEventListeners();
    
    // Update analytics every 60 seconds
    setInterval(updateAnalytics, 60000);
});

// Initialize WebSocket connection
function initializeSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('Analytics connected to server');
    });
    
    socket.on('sensor_data', function(data) {
        updateAnalyticsWithNewData(data);
    });
}

// Load analytics data
async function loadAnalyticsData() {
    try {
        const response = await fetch('/api/analytics');
        analyticsData = await response.json();
        updateAnalyticsDisplay();
    } catch (error) {
        console.error('Error loading analytics data:', error);
        showNotification('Error loading analytics data', 'error');
    }
}

// Load water bodies
async function loadWaterBodies() {
    try {
        const response = await fetch('/api/water-bodies');
        waterBodiesData = await response.json();
        populateWaterBodyFilter();
    } catch (error) {
        console.error('Error loading water bodies:', error);
    }
}

// Initialize charts
function initializeCharts() {
    initializeQualityDistributionChart();
    initializeParameterTrendsChart();
    initializeHistoricalChart();
    initializeAlertChart();
}

// Initialize quality distribution chart
function initializeQualityDistributionChart() {
    const ctx = document.getElementById('qualityDistributionChart').getContext('2d');
    charts.qualityDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Good', 'Fair', 'Poor'],
            datasets: [{
                data: [6, 1, 1],
                backgroundColor: ['#198754', '#ffc107', '#dc3545'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Initialize parameter trends chart
function initializeParameterTrendsChart() {
    const ctx = document.getElementById('parameterTrendsChart').getContext('2d');
    charts.parameterTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            datasets: [
                {
                    label: 'pH',
                    data: [7.2, 7.1, 7.3, 7.4, 7.2, 7.1],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Temperature (°C)',
                    data: [28, 26, 29, 32, 31, 29],
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Dissolved Oxygen (mg/L)',
                    data: [8.5, 8.8, 8.2, 7.9, 8.1, 8.3],
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Initialize historical chart
function initializeHistoricalChart() {
    const ctx = document.getElementById('historicalChart').getContext('2d');
    charts.historical = new Chart(ctx, {
        type: 'line',
        data: {
            labels: generateTimeLabels(24),
            datasets: [
                {
                    label: 'Average pH',
                    data: generateRandomData(24, 6.8, 8.2),
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Average Temperature (°C)',
                    data: generateRandomData(24, 25, 35),
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Initialize alert chart
function initializeAlertChart() {
    const ctx = document.getElementById('alertChart').getContext('2d');
    charts.alertChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['pH Alerts', 'Oxygen Alerts', 'Temperature Alerts', 'Turbidity Alerts'],
            datasets: [{
                label: 'Alert Count',
                data: [2, 1, 3, 1],
                backgroundColor: ['#dc3545', '#ffc107', '#fd7e14', '#6f42c1'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Generate time labels
function generateTimeLabels(count) {
    const labels = [];
    for (let i = 0; i < count; i++) {
        const hour = i.toString().padStart(2, '0');
        labels.push(`${hour}:00`);
    }
    return labels;
}

// Generate random data
function generateRandomData(count, min, max) {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push(Math.random() * (max - min) + min);
    }
    return data;
}

// Update analytics display
function updateAnalyticsDisplay() {
    // Update summary statistics
    document.getElementById('avg-ph').textContent = analyticsData.avg_ph || '7.2';
    document.getElementById('avg-temperature').textContent = `${analyticsData.avg_temperature || '28.5'}°C`;
    document.getElementById('avg-oxygen').textContent = `${analyticsData.avg_oxygen || '8.2'} mg/L`;
    document.getElementById('quality-score').textContent = calculateQualityScore() + '%';
    
    // Update quality distribution chart
    if (charts.qualityDistribution && analyticsData.quality_distribution) {
        const distribution = analyticsData.quality_distribution;
        charts.qualityDistribution.data.datasets[0].data = [
            distribution.Good || 0,
            distribution.Fair || 0,
            distribution.Poor || 0
        ];
        charts.qualityDistribution.update();
    }
    
    // Load detailed analysis table
    loadDetailedAnalysis();
}

// Calculate quality score
function calculateQualityScore() {
    if (!analyticsData.quality_distribution) return 85;
    
    const total = Object.values(analyticsData.quality_distribution).reduce((a, b) => a + b, 0);
    const good = analyticsData.quality_distribution.Good || 0;
    const fair = analyticsData.quality_distribution.Fair || 0;
    
    return Math.round(((good * 100) + (fair * 60)) / total);
}

// Load detailed analysis
async function loadDetailedAnalysis() {
    try {
        const tableBody = document.getElementById('analysis-table-body');
        tableBody.innerHTML = '';
        
        for (const waterBody of waterBodiesData) {
            const response = await fetch(`/api/sensor-data/${waterBody.id}`);
            const data = await response.json();
            
            if (data.current) {
                const quality = assessQuality(
                    data.current.ph,
                    data.current.temperature,
                    data.current.dissolved_oxygen,
                    data.current.turbidity
                );
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${waterBody.name}</strong></td>
                    <td>${data.current.ph || '--'}</td>
                    <td>${data.current.temperature || '--'}</td>
                    <td>${data.current.dissolved_oxygen || '--'}</td>
                    <td>${data.current.turbidity || '--'}</td>
                    <td><span class="quality-badge ${quality.grade.toLowerCase()}">${quality.grade}</span></td>
                    <td>
                        <span class="badge bg-warning">2 alerts</span>
                    </td>
                `;
                tableBody.appendChild(row);
            }
        }
    } catch (error) {
        console.error('Error loading detailed analysis:', error);
    }
}

// Populate water body filter
function populateWaterBodyFilter() {
    const filter = document.getElementById('water-body-filter');
    filter.innerHTML = '<option value="all">All Water Bodies</option>';
    
    waterBodiesData.forEach(waterBody => {
        const option = document.createElement('option');
        option.value = waterBody.id;
        option.textContent = waterBody.name;
        filter.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Time range filter
    document.getElementById('time-range').addEventListener('change', updateAnalytics);
    
    // Water body filter
    document.getElementById('water-body-filter').addEventListener('change', updateAnalytics);
    
    // Parameter filter
    document.getElementById('parameter-filter').addEventListener('change', updateAnalytics);
    
    // Generate report button
    document.getElementById('generate-report').addEventListener('click', generateReport);
}

// Update analytics with new data
function updateAnalyticsWithNewData(data) {
    // Update charts with new data points
    if (charts.parameterTrends) {
        const labels = charts.parameterTrends.data.labels;
        const newTime = new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Add new data point
        labels.push(newTime);
        if (labels.length > 10) labels.shift();
        
        charts.parameterTrends.data.datasets[0].data.push(data.ph);
        charts.parameterTrends.data.datasets[1].data.push(data.temperature);
        charts.parameterTrends.data.datasets[2].data.push(data.dissolved_oxygen);
        
        if (charts.parameterTrends.data.datasets[0].data.length > 10) {
            charts.parameterTrends.data.datasets[0].data.shift();
            charts.parameterTrends.data.datasets[1].data.shift();
            charts.parameterTrends.data.datasets[2].data.shift();
        }
        
        charts.parameterTrends.update();
    }
}

// Update analytics
function updateAnalytics() {
    loadAnalyticsData();
    loadDetailedAnalysis();
}

// Generate report
function generateReport() {
    const button = document.getElementById('generate-report');
    const originalText = button.innerHTML;
    
    button.innerHTML = '<span class="loading-spinner"></span> Generating...';
    button.disabled = true;
    
    // Simulate report generation
    setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
        showNotification('Report generated successfully!', 'success');
        
        // Create download link
        const link = document.createElement('a');
        link.href = '#';
        link.download = `water-quality-report-${new Date().toISOString().split('T')[0]}.pdf`;
        link.innerHTML = 'Download Report';
        link.className = 'btn btn-outline-primary btn-sm ms-2';
        
        button.parentNode.appendChild(link);
        
        setTimeout(() => {
            if (link.parentNode) {
                link.remove();
            }
        }, 5000);
    }, 2000);
}

// Quality assessment function
function assessQuality(ph, temperature, dissolvedOxygen, turbidity) {
    let score = 0;
    
    if (ph >= 6.5 && ph <= 8.5) score += 25;
    else if (ph >= 6.0 && ph <= 9.0) score += 15;
    else score += 5;
    
    if (temperature >= 20 && temperature <= 30) score += 25;
    else if (temperature >= 15 && temperature <= 35) score += 15;
    else score += 5;
    
    if (dissolvedOxygen >= 6.0) score += 25;
    else if (dissolvedOxygen >= 4.0) score += 15;
    else score += 5;
    
    if (turbidity <= 10) score += 25;
    else if (turbidity <= 25) score += 15;
    else score += 5;
    
    return {
        score: score,
        grade: score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Poor'
    };
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Export functions for global access
window.generateReport = generateReport;
window.updateAnalytics = updateAnalytics; 