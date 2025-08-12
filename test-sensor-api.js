#!/usr/bin/env node

/**
 * Test script voor IoT Dashboard API
 * 
 * Gebruik:
 * node test-sensor-api.js <API_KEY> [value]
 * 
 * Voorbeeld:
 * node test-sensor-api.js 123e4567-e89b-12d3-a456-426614174000 23.5
 */

const API_BASE_URL = 'http://localhost:3000'

async function sendSensorData(apiKey, value = Math.random() * 30 + 10) {
  try {
    console.log(`🚀 Sending sensor data...`)
    console.log(`   API Key: ${apiKey}`)
    console.log(`   Value: ${value}`)
    console.log(`   Timestamp: ${new Date().toISOString()}`)
    
    const response = await fetch(`${API_BASE_URL}/api/sensor-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        value: parseFloat(value)
      })
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ Success!`)
      console.log(`   Data ID: ${data.data.id}`)
      console.log(`   Sensor: ${data.data.sensor_name}`)
      console.log(`   Stored Value: ${data.data.value}`)
      console.log(`   Timestamp: ${data.data.timestamp}`)
    } else {
      console.error(`❌ Error: ${data.error}`)
      console.error(`   Status: ${response.status}`)
    }
    
    return { success: response.ok, data }
    
  } catch (error) {
    console.error(`❌ Network Error:`, error.message)
    return { success: false, error: error.message }
  }
}

async function testHealthEndpoint() {
  try {
    console.log(`🏥 Testing health endpoint...`)
    const response = await fetch(`${API_BASE_URL}/api/health`)
    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ API is healthy!`)
      console.log(`   Message: ${data.message}`)
      console.log(`   Timestamp: ${data.timestamp}`)
      console.log(`   Version: ${data.version}`)
    } else {
      console.error(`❌ Health check failed`)
    }
  } catch (error) {
    console.error(`❌ Health check error:`, error.message)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const apiKey = args[0]
  const value = args[1]

  console.log(`🔧 IoT Dashboard API Test Tool`)
  console.log(`${'-'.repeat(40)}`)

  // Test health endpoint first
  await testHealthEndpoint()
  console.log()

  if (!apiKey) {
    console.log(`📋 Usage:`)
    console.log(`   node test-sensor-api.js <API_KEY> [value]`)
    console.log(``)
    console.log(`📝 Examples:`)
    console.log(`   node test-sensor-api.js 123e4567-e89b-12d3-a456-426614174000`)
    console.log(`   node test-sensor-api.js 123e4567-e89b-12d3-a456-426614174000 23.5`)
    console.log(``)
    console.log(`💡 Get your API key from the dashboard after creating a sensor.`)
    process.exit(1)
  }

  // Test sensor data endpoint
  await sendSensorData(apiKey, value)
}

if (require.main === module) {
  main()
}

module.exports = { sendSensorData, testHealthEndpoint }
