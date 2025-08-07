from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
import sqlite3
import json
import random
import time
import threading
from datetime import datetime, timedelta
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'delhi_water_monitoring_secret_key'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Database initialization
def init_db():
    conn = sqlite3.connect('data/water_monitoring.db')
    cursor = conn.cursor()
    
    # Create water bodies table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS water_bodies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            area REAL,
            status TEXT DEFAULT 'active'
        )
    ''')
    
    # Create sensor data table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            water_body_id INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            ph REAL,
            temperature REAL,
            dissolved_oxygen REAL,
            turbidity REAL,
            conductivity REAL,
            total_dissolved_solids REAL,
            FOREIGN KEY (water_body_id) REFERENCES water_bodies (id)
        )
    ''')
    
    # Create alerts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            water_body_id INTEGER,
            alert_type TEXT,
            message TEXT,
            severity TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'active',
            FOREIGN KEY (water_body_id) REFERENCES water_bodies (id)
        )
    ''')
    
    # Insert sample water bodies
    water_bodies = [
        ('Yamuna River', 28.7041, 77.1025, 1500.0),
        ('Hauz Khas Lake', 28.5511, 77.2000, 12.5),
        ('Sanjay Lake', 28.5689, 77.3125, 8.2),
        ('Buddha Jayanti Park Lake', 28.6041, 77.2455, 6.8),
        ('Neela Hauz Lake', 28.5511, 77.2000, 4.5),
        ('Roshanara Bagh Lake', 28.6681, 77.2097, 3.2),
        ('Coronation Park Lake', 28.7041, 77.1025, 2.8),
        ('Lodhi Garden Lake', 28.5896, 77.2276, 1.5)
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO water_bodies (name, latitude, longitude, area)
        VALUES (?, ?, ?, ?)
    ''', water_bodies)
    
    conn.commit()
    conn.close()

# Initialize database
os.makedirs('data', exist_ok=True)
init_db()

# Sensor data simulation
def generate_sensor_data():
    """Generate realistic sensor data for water bodies"""
    while True:
        conn = sqlite3.connect('data/water_monitoring.db')
        cursor = conn.cursor()
        
        # Get all water bodies
        cursor.execute('SELECT id, name FROM water_bodies WHERE status = "active"')
        water_bodies = cursor.fetchall()
        
        for water_body_id, name in water_bodies:
            # Generate realistic water quality parameters
            ph = round(random.uniform(6.5, 8.5), 2)
            temperature = round(random.uniform(20, 35), 1)
            dissolved_oxygen = round(random.uniform(4.0, 12.0), 2)
            turbidity = round(random.uniform(0.1, 50.0), 1)
            conductivity = round(random.uniform(100, 2000), 0)
            tds = round(random.uniform(50, 1500), 0)
            
            # Insert sensor data
            cursor.execute('''
                INSERT INTO sensor_data 
                (water_body_id, ph, temperature, dissolved_oxygen, turbidity, conductivity, total_dissolved_solids)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (water_body_id, ph, temperature, dissolved_oxygen, turbidity, conductivity, tds))
            
            # Check for critical alerts
            alerts = []
            if ph < 6.0 or ph > 9.0:
                alerts.append(('pH Alert', f'pH level critical: {ph}', 'high'))
            if dissolved_oxygen < 4.0:
                alerts.append(('Oxygen Alert', f'Low dissolved oxygen: {dissolved_oxygen} mg/L', 'high'))
            if temperature > 35:
                alerts.append(('Temperature Alert', f'High water temperature: {temperature}°C', 'medium'))
            if turbidity > 40:
                alerts.append(('Turbidity Alert', f'High turbidity: {turbidity} NTU', 'medium'))
            
            # Insert alerts
            for alert_type, message, severity in alerts:
                cursor.execute('''
                    INSERT INTO alerts (water_body_id, alert_type, message, severity)
                    VALUES (?, ?, ?, ?)
                ''', (water_body_id, alert_type, message, severity))
            
            # Emit real-time data via WebSocket
            data = {
                'water_body_id': water_body_id,
                'name': name,
                'timestamp': datetime.now().isoformat(),
                'ph': ph,
                'temperature': temperature,
                'dissolved_oxygen': dissolved_oxygen,
                'turbidity': turbidity,
                'conductivity': conductivity,
                'total_dissolved_solids': tds,
                'alerts': alerts
            }
            socketio.emit('sensor_data', data)
        
        conn.commit()
        conn.close()
        time.sleep(30)  # Update every 30 seconds

# Start sensor data simulation in background
sensor_thread = threading.Thread(target=generate_sensor_data, daemon=True)
sensor_thread.start()

@app.route('/')
def dashboard():
    """Main dashboard page"""
    return render_template('dashboard.html')

@app.route('/map')
def map_view():
    """Interactive map view"""
    return render_template('map.html')

@app.route('/analytics')
def analytics():
    """Analytics and reports page"""
    return render_template('analytics.html')

@app.route('/api/water-bodies')
def get_water_bodies():
    """API endpoint to get all water bodies"""
    conn = sqlite3.connect('data/water_monitoring.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, name, latitude, longitude, area, status
        FROM water_bodies
        WHERE status = 'active'
    ''')
    
    water_bodies = []
    for row in cursor.fetchall():
        water_bodies.append({
            'id': row[0],
            'name': row[1],
            'latitude': row[2],
            'longitude': row[3],
            'area': row[4],
            'status': row[5]
        })
    
    conn.close()
    return jsonify(water_bodies)

@app.route('/api/sensor-data/<int:water_body_id>')
def get_sensor_data(water_body_id):
    """API endpoint to get sensor data for a specific water body"""
    conn = sqlite3.connect('data/water_monitoring.db')
    cursor = conn.cursor()
    
    # Get latest sensor data
    cursor.execute('''
        SELECT ph, temperature, dissolved_oxygen, turbidity, conductivity, total_dissolved_solids, timestamp
        FROM sensor_data
        WHERE water_body_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
    ''', (water_body_id,))
    
    data = cursor.fetchone()
    if data:
        sensor_data = {
            'ph': data[0],
            'temperature': data[1],
            'dissolved_oxygen': data[2],
            'turbidity': data[3],
            'conductivity': data[4],
            'total_dissolved_solids': data[5],
            'timestamp': data[6]
        }
    else:
        sensor_data = {}
    
    # Get historical data for charts
    cursor.execute('''
        SELECT ph, temperature, dissolved_oxygen, turbidity, timestamp
        FROM sensor_data
        WHERE water_body_id = ?
        ORDER BY timestamp DESC
        LIMIT 24
    ''', (water_body_id,))
    
    historical_data = []
    for row in cursor.fetchall():
        historical_data.append({
            'ph': row[0],
            'temperature': row[1],
            'dissolved_oxygen': row[2],
            'turbidity': row[3],
            'timestamp': row[4]
        })
    
    conn.close()
    return jsonify({
        'current': sensor_data,
        'historical': historical_data
    })

@app.route('/api/alerts')
def get_alerts():
    """API endpoint to get active alerts"""
    conn = sqlite3.connect('data/water_monitoring.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT a.id, wb.name, a.alert_type, a.message, a.severity, a.timestamp
        FROM alerts a
        JOIN water_bodies wb ON a.water_body_id = wb.id
        WHERE a.status = 'active'
        ORDER BY a.timestamp DESC
        LIMIT 10
    ''')
    
    alerts = []
    for row in cursor.fetchall():
        alerts.append({
            'id': row[0],
            'water_body': row[1],
            'type': row[2],
            'message': row[3],
            'severity': row[4],
            'timestamp': row[5]
        })
    
    conn.close()
    return jsonify(alerts)

@app.route('/api/analytics')
def get_analytics():
    """API endpoint for analytics data"""
    conn = sqlite3.connect('data/water_monitoring.db')
    cursor = conn.cursor()
    
    # Get summary statistics
    cursor.execute('''
        SELECT 
            COUNT(DISTINCT water_body_id) as total_bodies,
            AVG(ph) as avg_ph,
            AVG(temperature) as avg_temperature,
            AVG(dissolved_oxygen) as avg_oxygen,
            AVG(turbidity) as avg_turbidity
        FROM sensor_data
        WHERE timestamp >= datetime('now', '-24 hours')
    ''')
    
    stats = cursor.fetchone()
    
    # Get water quality distribution
    cursor.execute('''
        SELECT 
            CASE 
                WHEN ph < 6.0 OR ph > 9.0 THEN 'Poor'
                WHEN ph < 6.5 OR ph > 8.5 THEN 'Fair'
                ELSE 'Good'
            END as quality,
            COUNT(*) as count
        FROM sensor_data
        WHERE timestamp >= datetime('now', '-24 hours')
        GROUP BY quality
    ''')
    
    quality_distribution = {}
    for row in cursor.fetchall():
        quality_distribution[row[0]] = row[1]
    
    conn.close()
    
    return jsonify({
        'total_bodies': stats[0],
        'avg_ph': round(stats[1], 2) if stats[1] else 0,
        'avg_temperature': round(stats[2], 1) if stats[2] else 0,
        'avg_oxygen': round(stats[3], 2) if stats[3] else 0,
        'avg_turbidity': round(stats[4], 1) if stats[4] else 0,
        'quality_distribution': quality_distribution
    })

@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection"""
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection"""
    print('Client disconnected')

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000) 