#!/usr/bin/env node

/**
 * DS18B20 Temperature Simulator
 * 
 * Simuleert een Arduino DS18B20 temperatuursensor die data naar de IoT Dashboard API stuurt.
 * Gebruik dit om je API te testen voordat je de echte sensor aansluit.
 */

const https = require('https');
const http = require('http');

// Configuratie
const CONFIG = {
  apiUrl: 'http://localhost:3000/api/sensor-data',
  apiKey: 'a131a412-72ea-42cd-892d-32b58cc138fd', // Vervang met jouw API key
  sensorName: 'Temperatuur Sensor',
  interval: 30000, // 30 seconden
  
  // Simulatie parameters
  baseTemp: 20.0,        // Basis temperatuur in °C
  tempVariation: 5.0,    // Variatie in temperatuur
  noiseLevel: 0.2        // Random noise level
};

let messageCount = 0;

/**
 * Genereert realistische temperatuur data
 */
function generateTemperatureData() {
  // Simuleer dagelijkse temperatuurcyclus (hoger overdag, lager 's nachts)
  const hour = new Date().getHours();
  const dailyCycle = 0.5 + 0.5 * Math.sin((hour - 6) * Math.PI / 12);
  
  // Basis temperatuur met dagcyclus
  let temp = CONFIG.baseTemp + CONFIG.tempVariation * dailyCycle;
  
  // Voeg seizoenseffect toe (eenvoudig)
  const month = new Date().getMonth();
  const seasonalEffect = 5 * Math.sin((month - 3) * Math.PI / 6); // Min in januari, max in juli
  temp += seasonalEffect;
  
  // Voeg noise toe voor realisme
  temp += CONFIG.noiseLevel * (Math.random() - 0.5);
  
  // Voeg willekeurige spikes toe (bijv. deur open)
  if (Math.random() < 0.05) { // 5% kans
    temp += (Math.random() - 0.5) * 10; // Grote variatie
  }
  
  return {
    value: parseFloat(temp.toFixed(2))
    // timestamp wordt door server gegenereerd
  };
}

/**
 * Stuurt data naar de API
 */
function sendTemperatureData() {
  const data = generateTemperatureData();
  const payload = JSON.stringify(data);
  
  console.log(`\n🌡️  [${++messageCount}] Sending temperature data:`);
  console.log(`   Temperature: ${data.value}°C`);
  console.log(`   Time: ${data.timestamp}`);
  
  const url = new URL(CONFIG.apiUrl);
  const client = url.protocol === 'https:' ? https : http;
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.apiKey}`,
      'Content-Length': Buffer.byteLength(payload)
    }
  };
  
  const req = client.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 201) {
        console.log('   ✅ Success!');
        
        try {
          const response = JSON.parse(responseData);
          if (response.success && response.data) {
            console.log(`   📊 Sensor: ${response.data.sensor_name}`);
            console.log(`   💾 Stored: ${response.data.value}°C`);
            console.log(`   🆔 ID: ${response.data.id}`);
          }
        } catch (e) {
          console.log(`   📝 Response: ${responseData}`);
        }
      } else {
        console.log(`   ❌ Failed! Status: ${res.statusCode}`);
        console.log(`   📝 Response: ${responseData}`);
      }
    });
  });
  
  req.on('error', (error) => {
    console.log(`   ❌ Network error: ${error.message}`);
  });
  
  req.write(payload);
  req.end();
}

/**
 * Test API verbinding
 */
function testApiConnection() {
  console.log('🔍 Testing API connection...');
  
  const healthUrl = CONFIG.apiUrl.replace('/sensor-data', '/health');
  const url = new URL(healthUrl);
  const client = url.protocol === 'https:' ? https : http;
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'GET'
  };
  
  const req = client.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ API is healthy!');
        try {
          const response = JSON.parse(responseData);
          console.log(`   Service: ${response.service || response.message}`);
          console.log(`   Version: ${response.version}`);
        } catch (e) {
          console.log(`   Response: ${responseData}`);
        }
      } else {
        console.log(`❌ API health check failed! Status: ${res.statusCode}`);
        console.log(`Response: ${responseData}`);
      }
      
      console.log('\n' + '='.repeat(50));
      startSimulation();
    });
  });
  
  req.on('error', (error) => {
    console.log(`❌ API connection failed: ${error.message}`);
    console.log('❓ Is je development server running? (npm run dev)');
    process.exit(1);
  });
  
  req.end();
}

/**
 * Start de simulatie
 */
function startSimulation() {
  console.log('🚀 Starting DS18B20 temperature simulation...');
  console.log(`📡 API: ${CONFIG.apiUrl}`);
  console.log(`⏱️  Interval: ${CONFIG.interval / 1000}s`);
  console.log(`🌡️  Base temp: ${CONFIG.baseTemp}°C`);
  console.log('');
  console.log('💡 Tip: Ga naar http://localhost:3000/dashboard om live data te zien');
  console.log('🛑 Stop met Ctrl+C');
  console.log('\n' + '='.repeat(50));
  
  // Eerste data direct versturen
  sendTemperatureData();
  
  // Dan elke X seconden
  setInterval(sendTemperatureData, CONFIG.interval);
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping temperature simulation...');
  console.log(`📊 Total messages sent: ${messageCount}`);
  console.log('👋 Goodbye!');
  process.exit(0);
});

// Help tekst
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🌡️  DS18B20 Temperature Simulator
================================

Simulates an Arduino DS18B20 temperature sensor sending data to your IoT Dashboard.

Usage:
  node temperature_simulator.js [API_KEY] [options]

Arguments:
  API_KEY       Your sensor API key (optional, will use default)

Options:
  --interval N  Send interval in seconds (default: 30)
  --temp N      Base temperature in °C (default: 20.0)
  --variation N Temperature variation range (default: 5.0)
  --help        Show this help

Examples:
  node temperature_simulator.js
  node temperature_simulator.js a131a412-72ea-42cd-892d-32b58cc138fd
  node temperature_simulator.js --interval 10 --temp 25.0
  node temperature_simulator.js --temp 15.0 --variation 8.0

🔧 Configuration:
  Edit the CONFIG object at the top of this file to change:
  - API URL (for production use)
  - Default API key
  - Temperature simulation parameters

🌡️  Temperature Features:
  - Daily temperature cycle (warmer during day)
  - Seasonal variation simulation
  - Random noise for realism
  - Occasional temperature spikes (door opening, etc.)
`);
  process.exit(0);
}

// Parse command line arguments
if (process.argv[2] && !process.argv[2].startsWith('--')) {
  CONFIG.apiKey = process.argv[2];
  console.log(`🔑 Using provided API key: ${CONFIG.apiKey}`);
}

const intervalArg = process.argv.indexOf('--interval');
if (intervalArg !== -1 && process.argv[intervalArg + 1]) {
  CONFIG.interval = parseInt(process.argv[intervalArg + 1]) * 1000;
  console.log(`⏱️  Using custom interval: ${CONFIG.interval / 1000}s`);
}

const tempArg = process.argv.indexOf('--temp');
if (tempArg !== -1 && process.argv[tempArg + 1]) {
  CONFIG.baseTemp = parseFloat(process.argv[tempArg + 1]);
  console.log(`🌡️  Using custom base temperature: ${CONFIG.baseTemp}°C`);
}

const variationArg = process.argv.indexOf('--variation');
if (variationArg !== -1 && process.argv[variationArg + 1]) {
  CONFIG.tempVariation = parseFloat(process.argv[variationArg + 1]);
  console.log(`📊 Using custom variation: ${CONFIG.tempVariation}°C`);
}

// Start het programma
console.log('🌡️  IoT Dashboard - DS18B20 Temperature Simulator');
console.log('===============================================');
testApiConnection();
