// Delhi Water Monitoring Map View JavaScript

// Global variables
let map;
let markers = [];
let waterBodiesData = [];
let selectedMarker = null;
let socket;

// Initialize the map
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    initializeSocket();
    loadWaterBodies();
    setupEventListeners();
    updateMapStatistics();
});

// Initialize Leaflet map
function initializeMap() {
    // Center on Delhi
    map = L.map('map').setView([28.7041, 77.1025], 10);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add scale control
    L.control.scale().addTo(map);
}

// Initialize WebSocket connection
function initializeSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('Map connected to server');
    });
    
    socket.on('sensor_data', function(data) {
        updateMarkerData(data);
    });
}

// Load water bodies from API
async function loadWaterBodies() {
    try {
        const response = await fetch('/api/water-bodies');
        waterBodiesData = await response.json();
        addMarkersToMap(waterBodiesData);
        populateWaterBodyFilter();
    } catch (error) {
        console.error('Error loading water bodies:', error);
        showNotification('Error loading water bodies', 'error');
    }
}

// Add markers to map
function addMarkersToMap(waterBodies) {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    waterBodies.forEach(waterBody => {
        const marker = createMarker(waterBody);
        markers.push(marker);
        marker.addTo(map);
    });
}

// Create a marker for a water body
function createMarker(waterBody) {
    // Determine marker color based on quality (simulated)
    const quality = getWaterBodyQuality(waterBody);
    const markerColor = getMarkerColor(quality);
    
    // Create custom icon
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            width: 20px; 
            height: 20px; 
            background-color: ${markerColor}; 
            border: 2px solid white; 
            border-radius: 50%; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    
    const marker = L.marker([waterBody.latitude, waterBody.longitude], { icon: icon });
    
    // Add popup
    const popupContent = `
        <div style="min-width: 200px;">
            <h6 class="mb-2">${waterBody.name}</h6>
            <p class="mb-1"><strong>Area:</strong> ${waterBody.area} sq km</p>
            <p class="mb-1"><strong>Status:</strong> <span class="badge bg-success">Active</span></p>
            <button class="btn btn-sm btn-primary mt-2" onclick="showWaterBodyDetails(${waterBody.id})">
                View Details
            </button>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    
    // Add click event
    marker.on('click', function() {
        selectWaterBodyMarker(waterBody);
    });
    
    return marker;
}

// Get water body quality (simulated)
function getWaterBodyQuality(waterBody) {
    // Simulate quality based on water body characteristics
    const random = Math.random();
    if (random > 0.7) return 'good';
    if (random > 0.4) return 'fair';
    return 'poor';
}

// Get marker color based on quality
function getMarkerColor(quality) {
    switch (quality) {
        case 'good': return '#198754';
        case 'fair': return '#ffc107';
        case 'poor': return '#dc3545';
        default: return '#6c757d';
    }
}

// Select water body marker
function selectWaterBodyMarker(waterBody) {
    // Reset previous selection
    if (selectedMarker) {
        selectedMarker.setIcon(selectedMarker.options.icon);
    }
    
    // Highlight selected marker
    selectedMarker = markers.find(marker => 
        marker.getLatLng().lat === waterBody.latitude && 
        marker.getLatLng().lng === waterBody.longitude
    );
    
    if (selectedMarker) {
        const selectedIcon = L.divIcon({
            className: 'custom-marker selected',
            html: `<div style="
                width: 25px; 
                height: 25px; 
                background-color: #0d6efd; 
                border: 3px solid white; 
                border-radius: 50%; 
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
            "></div>`,
            iconSize: [25, 25],
            iconAnchor: [12.5, 12.5]
        });
        selectedMarker.setIcon(selectedIcon);
    }
    
    // Show water body details
    showWaterBodyDetails(waterBody.id);
}

// Show water body details
async function showWaterBodyDetails(waterBodyId) {
    try {
        const response = await fetch(`/api/sensor-data/${waterBodyId}`);
        const data = await response.json();
        
        const waterBody = waterBodiesData.find(wb => wb.id === waterBodyId);
        
        if (waterBody && data.current) {
            displayWaterBodyInfo(waterBody, data.current);
        }
    } catch (error) {
        console.error('Error loading water body details:', error);
    }
}

// Display water body information
function displayWaterBodyInfo(waterBody, sensorData) {
    const infoContainer = document.getElementById('water-body-info');
    const detailsContainer = document.getElementById('selected-water-body-details');
    
    infoContainer.style.display = 'none';
    detailsContainer.style.display = 'block';
    
    // Update basic info
    document.getElementById('selected-name').textContent = waterBody.name;
    document.getElementById('selected-area').textContent = `${waterBody.area} sq km`;
    document.getElementById('selected-status').innerHTML = '<span class="badge bg-success">Active</span>';
    
    // Update sensor data
    document.getElementById('selected-ph').textContent = sensorData.ph || '--';
    document.getElementById('selected-temperature').textContent = sensorData.temperature || '--';
    document.getElementById('selected-oxygen').textContent = sensorData.dissolved_oxygen || '--';
    document.getElementById('selected-turbidity').textContent = sensorData.turbidity || '--';
    
    // Update alerts
    updateSelectedAlerts(waterBody.id);
}

// Update selected water body alerts
async function updateSelectedAlerts(waterBodyId) {
    try {
        const response = await fetch('/api/alerts');
        const alerts = await response.json();
        const waterBodyAlerts = alerts.filter(alert => {
            const waterBody = waterBodiesData.find(wb => wb.id === waterBodyId);
            return alert.water_body === waterBody.name;
        });
        
        const alertsContainer = document.getElementById('selected-alerts');
        if (waterBodyAlerts.length > 0) {
            alertsContainer.innerHTML = '<h6 class="text-warning">Active Alerts</h6>';
            waterBodyAlerts.forEach(alert => {
                const alertElement = document.createElement('div');
                alertElement.className = `alert alert-${alert.severity === 'high' ? 'danger' : 'warning'} alert-sm`;
                alertElement.textContent = alert.message;
                alertsContainer.appendChild(alertElement);
            });
        } else {
            alertsContainer.innerHTML = '<h6 class="text-success">No Active Alerts</h6>';
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

// Update marker data from WebSocket
function updateMarkerData(data) {
    const marker = markers.find(m => {
        const waterBody = waterBodiesData.find(wb => wb.id === data.water_body_id);
        return waterBody && m.getLatLng().lat === waterBody.latitude && m.getLatLng().lng === waterBody.longitude;
    });
    
    if (marker) {
        // Update marker color based on new data
        const quality = assessQuality(data.ph, data.temperature, data.dissolved_oxygen, data.turbidity);
        const newColor = getMarkerColor(quality.grade.toLowerCase());
        
        const newIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                width: 20px; 
                height: 20px; 
                background-color: ${newColor}; 
                border: 2px solid white; 
                border-radius: 50%; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        marker.setIcon(newIcon);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Quality filter
    document.getElementById('quality-filter').addEventListener('change', filterMarkers);
    
    // Alert filter
    document.getElementById('alert-filter').addEventListener('change', filterMarkers);
    
    // Size filter
    document.getElementById('size-filter').addEventListener('change', filterMarkers);
    
    // Refresh button
    document.getElementById('refresh-map').addEventListener('click', refreshMapData);
}

// Filter markers based on selected criteria
function filterMarkers() {
    const qualityFilter = document.getElementById('quality-filter').value;
    const alertFilter = document.getElementById('alert-filter').value;
    const sizeFilter = document.getElementById('size-filter').value;
    
    markers.forEach((marker, index) => {
        const waterBody = waterBodiesData[index];
        let show = true;
        
        // Quality filter
        if (qualityFilter !== 'all') {
            const quality = getWaterBodyQuality(waterBody);
            if (quality !== qualityFilter) show = false;
        }
        
        // Size filter
        if (sizeFilter !== 'all') {
            if (sizeFilter === 'large' && waterBody.area <= 10) show = false;
            if (sizeFilter === 'medium' && (waterBody.area <= 1 || waterBody.area > 10)) show = false;
            if (sizeFilter === 'small' && waterBody.area >= 1) show = false;
        }
        
        // Alert filter (simplified)
        if (alertFilter !== 'all') {
            // This would need to be implemented with actual alert data
            show = true; // Placeholder
        }
        
        if (show) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }
    });
    
    updateMapStatistics();
}

// Refresh map data
async function refreshMapData() {
    const button = document.getElementById('refresh-map');
    const originalText = button.innerHTML;
    
    button.innerHTML = '<span class="loading-spinner"></span> Refreshing...';
    button.disabled = true;
    
    try {
        await loadWaterBodies();
        updateMapStatistics();
        showNotification('Map data refreshed successfully', 'success');
    } catch (error) {
        showNotification('Error refreshing map data', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
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

// Update map statistics
function updateMapStatistics() {
    const visibleMarkers = markers.filter(marker => map.hasLayer(marker));
    
    document.getElementById('total-markers').textContent = visibleMarkers.length;
    document.getElementById('active-alerts').textContent = '2'; // Placeholder
    document.getElementById('good-quality-count').textContent = '5'; // Placeholder
    document.getElementById('poor-quality-count').textContent = '1'; // Placeholder
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
window.showWaterBodyDetails = showWaterBodyDetails;
window.selectWaterBodyMarker = selectWaterBodyMarker; 