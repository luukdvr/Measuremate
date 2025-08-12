/*
 * IoT Dashboard - ESP32/Arduino Example
 * 
 * Dit voorbeeld toont hoe je sensor data kunt verzenden vanaf een ESP32
 * naar je IoT Dashboard platform.
 * 
 * Hardware:
 * - ESP32 development board
 * - DHT22 sensor (optioneel)
 * - WiFi verbinding
 * 
 * Libraries nodig:
 * - WiFi library (ESP32 core)
 * - HTTPClient library (ESP32 core)
 * - ArduinoJson library
 * - DHT sensor library (optioneel)
 * 
 * Installatie:
 * 1. Installeer ESP32 board package in Arduino IDE
 * 2. Installeer ArduinoJson library via Library Manager
 * 3. Pas WiFi credentials en API key aan
 * 4. Upload naar je ESP32
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi configuratie
const char* ssid = "JE_WIFI_NAAM";
const char* password = "JE_WIFI_WACHTWOORD";

// IoT Dashboard configuratie
const char* apiEndpoint = "https://jouw-app.vercel.app/api/sensor-data";
// Voor lokale ontwikkeling: "http://192.168.1.100:3000/api/sensor-data"
const char* apiKey = "JOUW_API_KEY_HIER";

// Sensor configuratie
const int sensorPin = A0;  // Analoge pin voor sensor
const unsigned long sendInterval = 30000;  // Send elke 30 seconden
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("🚀 IoT Dashboard ESP32 Client Starting...");
  
  // WiFi verbinding
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.print("✅ WiFi connected! IP address: ");
  Serial.println(WiFi.localIP());
  
  // Test API verbinding
  testApiConnection();
}

void loop() {
  // Check WiFi verbinding
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnected, reconnecting...");
    WiFi.reconnect();
    delay(5000);
    return;
  }
  
  // Send sensor data op interval
  if (millis() - lastSendTime >= sendInterval) {
    float sensorValue = readSensorValue();
    sendSensorData(sensorValue);
    lastSendTime = millis();
  }
  
  delay(1000);  // Small delay voor stabiele loop
}

float readSensorValue() {
  // Lees analoge waarde en converteer naar zinvolle eenheid
  int rawValue = analogRead(sensorPin);
  
  // Voorbeeld: converteer naar temperatuur (0-50°C)
  float temperature = (rawValue / 4095.0) * 50.0;
  
  // Voeg wat ruis toe voor realistische data
  temperature += random(-100, 100) / 100.0;
  
  Serial.print("📊 Sensor reading: ");
  Serial.print(temperature);
  Serial.println("°C");
  
  return temperature;
}

void sendSensorData(float value) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(apiEndpoint);
    
    // Headers instellen
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + apiKey);
    
    // JSON payload maken
    DynamicJsonDocument doc(1024);
    doc["value"] = value;
    doc["timestamp"] = getISO8601Timestamp();
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.print("📡 Sending data: ");
    Serial.println(jsonString);
    
    // POST request verzenden
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      
      if (httpResponseCode == 201) {
        Serial.println("✅ Data sent successfully!");
        
        // Parse response voor details
        DynamicJsonDocument responseDoc(1024);
        deserializeJson(responseDoc, response);
        
        if (responseDoc["success"]) {
          Serial.print("   Sensor: ");
          Serial.println(responseDoc["data"]["sensor_name"].as<String>());
          Serial.print("   Value: ");
          Serial.println(responseDoc["data"]["value"].as<float>());
        }
      } else {
        Serial.print("❌ HTTP Error: ");
        Serial.print(httpResponseCode);
        Serial.print(" - ");
        Serial.println(response);
      }
    } else {
      Serial.print("❌ Connection Error: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("❌ WiFi not connected");
  }
}

void testApiConnection() {
  Serial.println("🔍 Testing API connection...");
  
  HTTPClient http;
  http.begin("https://jouw-app.vercel.app/api/health");
  // Voor lokaal: http.begin("http://192.168.1.100:3000/api/health");
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("✅ API Health Check: ");
    Serial.println(response);
  } else {
    Serial.print("❌ API Health Check failed: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

String getISO8601Timestamp() {
  // Voor eenvoud gebruiken we epoch time
  // In productie zou je NTP tijd kunnen gebruiken
  unsigned long epochTime = millis() / 1000;
  return String(epochTime);
}

/*
 * Alternatieve sensor implementaties:
 */

// DHT22 Temperatuur en Luchtvochtigheid
/*
#include "DHT.h"
#define DHT_PIN 2
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

void setupDHT() {
  dht.begin();
}

float readTemperature() {
  float temp = dht.readTemperature();
  if (isnan(temp)) {
    Serial.println("❌ Failed to read from DHT sensor!");
    return 0.0;
  }
  return temp;
}

float readHumidity() {
  float humidity = dht.readHumidity();
  if (isnan(humidity)) {
    Serial.println("❌ Failed to read humidity from DHT sensor!");
    return 0.0;
  }
  return humidity;
}
*/

// Lichtsensor (LDR)
/*
float readLightLevel() {
  int rawValue = analogRead(A0);
  float lightPercentage = (rawValue / 4095.0) * 100.0;
  return lightPercentage;
}
*/

// Ultrasone afstandssensor (HC-SR04)
/*
#define TRIG_PIN 5
#define ECHO_PIN 18

float readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH);
  float distance = duration * 0.034 / 2;  // Convert to cm
  
  return distance;
}
*/
