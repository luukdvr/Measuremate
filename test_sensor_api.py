#!/usr/bin/env python3
"""
Test script voor IoT Dashboard API (Python versie)

Gebruik:
python test_sensor_api.py <API_KEY> [value]

Voorbeeld:
python test_sensor_api.py 123e4567-e89b-12d3-a456-426614174000 23.5
"""

import requests
import json
import sys
import random
from datetime import datetime

API_BASE_URL = 'http://localhost:3000'

def send_sensor_data(api_key, value=None):
    """Send sensor data to the API"""
    if value is None:
        value = random.uniform(10, 40)  # Random temperature between 10-40°C
    
    print(f"🚀 Sending sensor data...")
    print(f"   API Key: {api_key}")
    print(f"   Value: {value}")
    print(f"   Timestamp: {datetime.now().isoformat()}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/sensor-data",
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            },
            json={
                'value': float(value)
            }
        )
        
        data = response.json()
        
        if response.ok:
            print(f"✅ Success!")
            print(f"   Data ID: {data['data']['id']}")
            print(f"   Sensor: {data['data']['sensor_name']}")
            print(f"   Stored Value: {data['data']['value']}")
            print(f"   Timestamp: {data['data']['timestamp']}")
        else:
            print(f"❌ Error: {data.get('error', 'Unknown error')}")
            print(f"   Status: {response.status_code}")
            
        return {'success': response.ok, 'data': data}
        
    except requests.RequestException as e:
        print(f"❌ Network Error: {e}")
        return {'success': False, 'error': str(e)}

def test_health_endpoint():
    """Test the health endpoint"""
    print(f"🏥 Testing health endpoint...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/health")
        data = response.json()
        
        if response.ok:
            print(f"✅ API is healthy!")
            print(f"   Message: {data['message']}")
            print(f"   Timestamp: {data['timestamp']}")
            print(f"   Version: {data['version']}")
        else:
            print(f"❌ Health check failed")
            
    except requests.RequestException as e:
        print(f"❌ Health check error: {e}")

def simulate_multiple_readings(api_key, count=5, interval=1):
    """Simulate multiple sensor readings"""
    import time
    
    print(f"📊 Simulating {count} sensor readings...")
    
    for i in range(count):
        # Simulate temperature fluctuation
        base_temp = 22.0
        variation = random.uniform(-3, 3)
        temperature = round(base_temp + variation, 2)
        
        print(f"\n📡 Reading {i+1}/{count}:")
        result = send_sensor_data(api_key, temperature)
        
        if i < count - 1:  # Don't sleep after the last reading
            print(f"⏳ Waiting {interval} seconds...")
            time.sleep(interval)

def main():
    print(f"🔧 IoT Dashboard API Test Tool (Python)")
    print("-" * 40)
    
    # Test health endpoint first
    test_health_endpoint()
    print()
    
    if len(sys.argv) < 2:
        print(f"📋 Usage:")
        print(f"   python test_sensor_api.py <API_KEY> [value]")
        print(f"   python test_sensor_api.py <API_KEY> simulate [count]")
        print(f"")
        print(f"📝 Examples:")
        print(f"   python test_sensor_api.py 123e4567-e89b-12d3-a456-426614174000")
        print(f"   python test_sensor_api.py 123e4567-e89b-12d3-a456-426614174000 23.5")
        print(f"   python test_sensor_api.py 123e4567-e89b-12d3-a456-426614174000 simulate 10")
        print(f"")
        print(f"💡 Get your API key from the dashboard after creating a sensor.")
        sys.exit(1)
    
    api_key = sys.argv[1]
    
    if len(sys.argv) > 2 and sys.argv[2] == 'simulate':
        count = int(sys.argv[3]) if len(sys.argv) > 3 else 5
        simulate_multiple_readings(api_key, count)
    else:
        value = sys.argv[2] if len(sys.argv) > 2 else None
        send_sensor_data(api_key, value)

if __name__ == '__main__':
    main()
