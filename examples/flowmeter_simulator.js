#!/usr/bin/env node

/**
 * Flowmeter Simulator
 * 
 * Simuleert een Arduino flowmeter die data naar de IoT Dashboard API stuurt.
 * Gebruik dit om je API te testen voordat je de echte Arduino aansluit.
 */

const https = require('https');
const http = require('http');

// Configuratie
const CONFIG = {
  apiUrl: 'http://localhost:3000/api/sensor-data',
  apiKey: 'a131a412-72ea-42cd-892d-32b58cc138fd', // Vervang met jouw API key
  sensorName: 'Stroomsnelheid Sensor',
  interval: 30000, // 30 seconden
  
  // Simulatie parameters
  baseFlow: 5.0,        // Basis flow rate in L/min
  flowVariation: 2.0,   // Variatie in flow rate
  noiseLevel: 0.1       // Random noise level
};

let messageCount = 0;

/**
 * Genereert realistische flowmeter data
 */
function generateFlowData() {
  // Simuleer dagelijkse cyclus (hoger overdag, lager 's nachts)
  const hour = new Date().getHours();
  const dailyCycle = 0.5 + 0.5 * Math.sin((hour - 6) * Math.PI / 12);
  
  // Basis flow met dagcyclus
  let flow = CONFIG.baseFlow * dailyCycle;
  
  // Voeg variatie toe
  flow += CONFIG.flowVariation * (Math.random() - 0.5);
  
  // Voeg noise toe
  flow += CONFIG.noiseLevel * (Math.random() - 0.5);
  
  // Zorg dat flow niet negatief is
  flow = Math.max(0, flow);
  
  return {
    value: parseFloat(flow.toFixed(2))
    // timestamp wordt door server gegenereerd
  };
}

/**
 * Stuurt data naar de API
 */
function sendFlowData() {
  const data = generateFlowData();
  const payload = JSON.stringify(data);
  
  console.log(`\n🌊 [${++messageCount}] Sending flow data:`);
  console.log(`   Flow: ${data.value} L/min`);
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
            console.log(`   💾 Stored: ${response.data.value} L/min`);
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
  console.log('🚀 Starting flowmeter simulation...');
  console.log(`📡 API: ${CONFIG.apiUrl}`);
  console.log(`⏱️  Interval: ${CONFIG.interval / 1000}s`);
  console.log(`🌊 Base flow: ${CONFIG.baseFlow} L/min`);
  console.log('');
  console.log('💡 Tip: Ga naar http://localhost:3000/dashboard om live data te zien');
  console.log('🛑 Stop met Ctrl+C');
  console.log('\n' + '='.repeat(50));
  
  // Eerste data direct versturen
  sendFlowData();
  
  // Dan elke X seconden
  setInterval(sendFlowData, CONFIG.interval);
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping flowmeter simulation...');
  console.log(`📊 Total messages sent: ${messageCount}`);
  console.log('👋 Goodbye!');
  process.exit(0);
});

// Help tekst
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🌊 Flowmeter Simulator
=====================

Simulates an Arduino flowmeter sending data to your IoT Dashboard.

Usage:
  node flowmeter_simulator.js [API_KEY] [options]

Arguments:
  API_KEY       Your sensor API key (optional, will use default)

Options:
  --interval N  Send interval in seconds (default: 30)
  --flow N      Base flow rate in L/min (default: 5.0)
  --help        Show this help

Examples:
  node flowmeter_simulator.js
  node flowmeter_simulator.js a131a412-72ea-42cd-892d-32b58cc138fd
  node flowmeter_simulator.js --interval 10 --flow 8.5

🔧 Configuration:
  Edit the CONFIG object at the top of this file to change:
  - API URL (for production use)
  - Default API key
  - Flow simulation parameters
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

const flowArg = process.argv.indexOf('--flow');
if (flowArg !== -1 && process.argv[flowArg + 1]) {
  CONFIG.baseFlow = parseFloat(process.argv[flowArg + 1]);
  console.log(`🌊 Using custom base flow: ${CONFIG.baseFlow} L/min`);
}

// Start het programma
console.log('🌊 IoT Dashboard - Flowmeter Simulator');
console.log('=====================================');
testApiConnection();
