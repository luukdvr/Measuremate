/*
 * DS18B20 Temperature Sensor for Arduino UNO R4 WiFi
 * Sends temperature data to MeasureMate IoT Platform
 * 
 * Hardware Setup:
 * - DS18B20 Data Pin -> Arduino Pin 4
 * - DS18B20 VCC -> 3.3V or 5V
 * - DS18B20 GND -> GND
 * - 4.7kΩ pull-up resistor between Data and VCC
 * 
 * Required Libraries:
 * - WiFiS3 (included with Arduino UNO R4 WiFi)
 * - ArduinoJson (install via Library Manager)
 * - OneWire (install via Library Manager)
 * - DallasTemperature (install via Library Manager)
 */

#include <WiFiS3.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server configuration
const char* server = "measuremate.vercel.app";
const int port = 443; // HTTPS port
const char* apiKey = "YOUR_API_KEY"; // Get this from your MeasureMate dashboard

// DS18B20 configuration
#define TEMPERATURE_PIN 4
OneWire oneWire(TEMPERATURE_PIN);
DallasTemperature tempSensor(&oneWire);

// Timing
unsigned long lastReading = 0;
const unsigned long readingInterval = 30000; // 30 seconds

WiFiSSLClient client;

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);
  
  Serial.println("=== MeasureMate DS18B20 Temperature Sensor ===");
  Serial.println("Hardware: Arduino UNO R4 WiFi");
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
  // Connect to server
  if (!client.connect(server, port)) {
    Serial.print("Connection failed to ");
    Serial.println(server);
    return false;
  }
  
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["value"] = round(temperature * 100) / 100.0; // Round to 2 decimal places
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Create HTTP POST request
  String postData = "POST /api/sensor-data HTTP/1.1\r\n";
  postData += "Host: " + String(server) + "\r\n";
  postData += "Content-Type: application/json\r\n";
  postData += "Authorization: Bearer " + String(apiKey) + "\r\n";
  postData += "User-Agent: Arduino-UNO-R4-WiFi/1.0\r\n";
  postData += "Content-Length: " + String(jsonString.length()) + "\r\n";
  postData += "Connection: close\r\n";
  postData += "\r\n";
  postData += jsonString;
  
  // Send request
  client.print(postData);
  
  // Wait for response
  unsigned long timeout = millis();
  while (client.available() == 0) {
    if (millis() - timeout > 5000) {
      Serial.println("Timeout waiting for response");
      client.stop();
      return false;
    }
  }
  
  // Read response
  bool success = false;
  while (client.available()) {
    String line = client.readStringUntil('\r');
    if (line.indexOf("HTTP/1.1 200") != -1 || line.indexOf("HTTP/1.1 201") != -1) {
      success = true;
    }
  }
  
  client.stop();
  return success;
}
