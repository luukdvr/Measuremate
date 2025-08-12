/*
 * DS18B20 Temperature Sensor for ESP32
 * Sends temperature data to MeasureMate IoT Platform
 * 
 * Hardware Setup:
 * - DS18B20 Data Pin -> ESP32 GPIO 4
 * - DS18B20 VCC -> 3.3V
 * - DS18B20 GND -> GND
 * - 4.7kΩ pull-up resistor between Data and VCC
 * 
 * Required Libraries:
 * - WiFi (included with ESP32)
 * - HTTPClient (included with ESP32)
 * - ArduinoJson (install via Library Manager)
 * - OneWire (install via Library Manager)
 * - DallasTemperature (install via Library Manager)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server configuration
const char* serverURL = "https://measuremate.vercel.app/api/sensor-data";
const char* apiKey = "YOUR_API_KEY"; // Get this from your MeasureMate dashboard

// DS18B20 configuration
#define TEMPERATURE_PIN 4
OneWire oneWire(TEMPERATURE_PIN);
DallasTemperature tempSensor(&oneWire);

// Timing
unsigned long lastReading = 0;
const unsigned long readingInterval = 30000; // 30 seconds

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("=== MeasureMate DS18B20 Temperature Sensor ===");
  Serial.println("Hardware: ESP32");
  Serial.println("Server: https://measuremate.vercel.app/");
  
  // Initialize temperature sensor
  tempSensor.begin();
  Serial.print("Temperature sensor initialized. Found ");
  Serial.print(tempSensor.getDeviceCount());
  Serial.println(" devices.");
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println("Setup complete. Starting temperature monitoring...");
  Serial.println();
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi connection lost. Reconnecting...");
    connectWiFi();
  }
  
  // Read and send temperature every interval
  if (millis() - lastReading >= readingInterval) {
    readAndSendTemperature();
    lastReading = millis();
  }
  
  delay(1000); // Small delay to prevent excessive polling
}

void connectWiFi() {
  Serial.print("Connecting to WiFi network: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println();
    Serial.println("Failed to connect to WiFi. Please check credentials.");
    Serial.println("Retrying in 10 seconds...");
    delay(10000);
    connectWiFi(); // Retry
  }
}

void readAndSendTemperature() {
  Serial.print("[");
  Serial.print(millis() / 1000);
  Serial.print("s] ");
  
  // Request temperature reading
  tempSensor.requestTemperatures();
  
  // Get temperature in Celsius
  float temperature = tempSensor.getTempCByIndex(0);
  
  // Check if reading is valid
  if (temperature == DEVICE_DISCONNECTED_C) {
    Serial.println("ERROR: Temperature sensor disconnected or faulty!");
    return;
  }
  
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print("°C ");
  
  // Send to server
  if (sendTemperatureData(temperature)) {
    Serial.println("✓ Data sent successfully");
  } else {
    Serial.println("✗ Failed to send data");
  }
}

bool sendTemperatureData(float temperature) {
  HTTPClient http;
  http.begin(serverURL);
  
  // Set headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + String(apiKey));
  http.addHeader("User-Agent", "ESP32/1.0");
  
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["value"] = round(temperature * 100) / 100.0; // Round to 2 decimal places
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send POST request
  int httpResponseCode = http.POST(jsonString);
  
  // Check response
  bool success = false;
  if (httpResponseCode == 200 || httpResponseCode == 201) {
    success = true;
  } else {
    Serial.print("HTTP Error: ");
    Serial.print(httpResponseCode);
    Serial.print(" - ");
    Serial.println(http.getString());
  }
  
  http.end();
  return success;
}
