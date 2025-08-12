/*
 * IoT Dashboard Platform - Arduino UNO R4 DS18B20 Temperature Client
 * 
 * Deze code is voor Arduino UNO R4 WiFi en verzendt temperatuur data 
 * van een DS18B20 sensor naar je IoT Dashboard Platform via WiFi verbinding.
 * 
 * Hardware:
 * - Arduino UNO R4 WiFi (met ingebouwde WiFi)
 * - DS18B20 temperatuursensor op pin 4
 * - 4.7kΩ pull-up resistor tussen DATA en VCC
 * 
 * Libraries nodig:
 * - WiFiS3 (ingebouwd in UNO R4 WiFi)
 * - ArduinoJson
 * - OneWire
 * - DallasTemperature
 */

#include <WiFiS3.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ========================================
// CONFIGURATIE - PAS DEZE WAARDEN AAN
// ========================================

// WiFi configuratie
const char* ssid = "JouwWiFiNaam";
const char* password = "JouwWiFiWachtwoord";

// Jouw IoT Dashboard Platform configuratie
const char* server = "192.168.1.100";  // Pas aan naar jouw IP (zonder http://)
const int port = 3000;
const char* apiPath = "/api/sensor-data";
const char* apiKey = "a131a412-72ea-42cd-892d-32b58cc138fd";  // Jouw sensor API key

// ========================================
// HARDWARE CONFIGURATIE
// ========================================

#define ONE_WIRE_BUS 4          // DS18B20 data pin
#define TEMPERATURE_PRECISION 12 // 12-bit precisie (0.0625°C resolutie)
#define LED_PIN 13              // Built-in LED pin

// Setup OneWire en DallasTemperature
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// WiFi client
WiFiClient client;

// ========================================
// VARIABELEN
// ========================================

// Temperatuur variabelen
float temperature = 0.0;                     // Huidige temperatuur in °C
unsigned long lastMeasurementTime = 0;      // Tijdstempel laatste meting
unsigned long lastSendTime = 0;             // Tijdstempel laatste data verzending
const unsigned long sendInterval = 30000;   // Verstuur elke 30 seconden
const unsigned long measureInterval = 2000; // Meet elke 2 seconden

// Sensor configuratie
DeviceAddress sensorAddress;
bool sensorFound = false;

// ========================================
// SETUP
// ========================================

void setup() {
  Serial.begin(115200);
  delay(2000); // Wacht op Serial voor debugging
  
  while (!Serial) {
    ; // Wacht op serial poort verbinding
  }

  Serial.println("🚀 IoT Dashboard DS18B20 Temperature Client (UNO R4) Starting...");
  Serial.println("============================================================");
  
  // Setup pins
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Initialiseer DS18B20 sensor
  sensors.begin();
  
  // Zoek naar sensoren
  int deviceCount = sensors.getDeviceCount();
  Serial.print("🌡️  Found ");
  Serial.print(deviceCount);
  Serial.println(" temperature sensor(s)");
  
  if (deviceCount == 0) {
    Serial.println("❌ No DS18B20 sensors found! Check wiring:");
    Serial.println("   - VCC -> 5V");
    Serial.println("   - GND -> GND");
    Serial.println("   - DATA -> Pin 4");
    Serial.println("   - 4.7kΩ resistor between DATA and VCC");
    while (true) {
      digitalWrite(LED_PIN, (millis() / 500) % 2); // Knipperen bij fout
      delay(100);
    }
  }
  
  // Krijg het adres van de eerste sensor
  if (sensors.getAddress(sensorAddress, 0)) {
    sensorFound = true;
    Serial.print("🆔 Sensor address: ");
    for (uint8_t i = 0; i < 8; i++) {
      if (sensorAddress[i] < 16) Serial.print("0");
      Serial.print(sensorAddress[i], HEX);
    }
    Serial.println();
    
    // Stel resolutie in
    sensors.setResolution(sensorAddress, TEMPERATURE_PRECISION);
    Serial.print("🎯 Resolution set to ");
    Serial.print(sensors.getResolution(sensorAddress));
    Serial.println(" bits");
  }
  
  // Connect to WiFi
  connectToWiFi();
  
  lastMeasurementTime = millis();
  lastSendTime = millis();

  Serial.println("🌡️  DS18B20 temperature sensor initialized");
  Serial.println("✅ Setup complete!");
  Serial.println();

  // Test API verbinding
  testApiConnection();
}

// ========================================
// MAIN LOOP
// ========================================

void loop() {
  // Check WiFi verbinding
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnected, reconnecting...");
    connectToWiFi();
    return;
  }

  // Update status LED (knippert als connected)
  digitalWrite(LED_PIN, (millis() / 1000) % 2);

  // Meet temperatuur elke 2 seconden
  if (millis() - lastMeasurementTime >= measureInterval) {
    lastMeasurementTime = millis();
    readTemperature();
  }

  // Verstuur data naar API op interval
  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();
    sendTemperatureData();
  }

  delay(100);
}

// ========================================
// DS18B20 TEMPERATUUR FUNCTIES
// ========================================

void readTemperature() {
  if (!sensorFound) {
    Serial.println("❌ No sensor available");
    return;
  }
  
  // Start temperatuur conversie
  sensors.requestTemperatures();
  
  // Lees temperatuur
  float tempC = sensors.getTempC(sensorAddress);
  
  // Check voor geldige waarde
  if (tempC == DEVICE_DISCONNECTED_C) {
    Serial.println("❌ Error: Could not read temperature data");
    return;
  }
  
  temperature = tempC;
  
  // Toon debug informatie
  Serial.print("🌡️  Temperature: ");
  Serial.print(temperature, 2);
  Serial.println("°C");
}

// ========================================
// API COMMUNICATIE
// ========================================

void sendTemperatureData() {
  Serial.println();
  Serial.println("📡 Sending temperature data to IoT Dashboard...");
  
  if (client.connect(server, port)) {
    Serial.println("📡 Connected to server");
    
    // Maak JSON payload - laat server de timestamp genereren
    DynamicJsonDocument doc(256);
    doc["value"] = temperature;
    // timestamp wordt door server gegenereerd voor juiste tijd
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.print("📦 Payload: ");
    Serial.println(jsonString);
    
    // HTTP POST request
    client.print("POST ");
    client.print(apiPath);
    client.println(" HTTP/1.1");
    client.print("Host: ");
    client.print(server);
    client.print(":");
    client.println(port);
    client.println("Content-Type: application/json");
    client.print("Authorization: Bearer ");
    client.println(apiKey);
    client.print("Content-Length: ");
    client.println(jsonString.length());
    client.println();
    client.println(jsonString);
    
    // Lees response
    delay(1000); // Wacht op response
    
    bool headerEnded = false;
    String response = "";
    String statusLine = "";
    
    while (client.available()) {
      String line = client.readStringUntil('\n');
      
      if (statusLine == "") {
        statusLine = line;
      }
      
      if (line == "\r") {
        headerEnded = true;
        continue;
      }
      
      if (headerEnded) {
        response += line;
      }
    }
    
    client.stop();
    
    // Parse status code
    int statusCode = 0;
    if (statusLine.indexOf("HTTP/1.1") >= 0) {
      int spaceIndex = statusLine.indexOf(' ');
      if (spaceIndex >= 0) {
        statusCode = statusLine.substring(spaceIndex + 1, spaceIndex + 4).toInt();
      }
    }
    
    Serial.print("📬 Response: ");
    Serial.print(statusCode);
    Serial.print(" - ");
    
    if (statusCode == 201) {
      Serial.println("✅ Success!");
      
      // Parse response voor details
      DynamicJsonDocument responseDoc(512);
      DeserializationError error = deserializeJson(responseDoc, response);
      
      if (!error && responseDoc["success"]) {
        Serial.print("   📊 Sensor: ");
        Serial.println(responseDoc["data"]["sensor_name"].as<String>());
        Serial.print("   🌡️  Value: ");
        Serial.print(responseDoc["data"]["value"].as<float>());
        Serial.println("°C");
      }
      
      // Flash LED on success
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      
    } else {
      Serial.println("❌ Failed!");
      Serial.print("   Response: ");
      Serial.println(response);
    }
    
  } else {
    Serial.println("❌ Connection to server failed");
  }
  
  Serial.println();
}

void testApiConnection() {
  Serial.println("🔍 Testing API connection...");
  
  if (client.connect(server, port)) {
    client.print("GET /api/health HTTP/1.1\r\n");
    client.print("Host: ");
    client.print(server);
    client.print(":");
    client.print(port);
    client.print("\r\n");
    client.print("Connection: close\r\n\r\n");
    
    delay(1000);
    
    bool found200 = false;
    while (client.available()) {
      String line = client.readStringUntil('\n');
      if (line.indexOf("200") >= 0) {
        found200 = true;
        break;
      }
    }
    
    if (found200) {
      Serial.println("✅ API connection successful!");
    } else {
      Serial.println("❌ API responded but not with 200 OK");
    }
    
    client.stop();
  } else {
    Serial.println("❌ API connection failed!");
    Serial.println("   Check if your development server is running");
    Serial.println("   Check if the IP address is correct");
  }
  
  Serial.println();
}

// ========================================
// WIFI FUNCTIES
// ========================================

void connectToWiFi() {
  Serial.print("📶 Connecting to WiFi: ");
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
    Serial.println("✅ WiFi connected!");
    printWiFiStatus();
  } else {
    Serial.println();
    Serial.println("❌ WiFi connection failed!");
    Serial.println("   Check SSID and password");
    Serial.println("   Check if WiFi is in range");
    delay(5000);
  }
}

void printWiFiStatus() {
  // Print SSID
  Serial.print("   SSID: ");
  Serial.println(WiFi.SSID());
  
  // Print IP address
  IPAddress ip = WiFi.localIP();
  Serial.print("   IP Address: ");
  Serial.println(ip);
  
  // Print signal strength
  long rssi = WiFi.RSSI();
  Serial.print("   Signal strength (RSSI): ");
  Serial.print(rssi);
  Serial.println(" dBm");
  Serial.println();
}

// ========================================
// DEBUG EN MONITORING
// ========================================

void printSystemStatus() {
  Serial.println("📊 System Status:");
  Serial.print("   WiFi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
  Serial.print("   IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("   Signal: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  Serial.print("   Temperature: ");
  Serial.print(temperature);
  Serial.println("°C");
  Serial.print("   Uptime: ");
  Serial.print(millis() / 1000);
  Serial.println(" seconds");
  Serial.println();
}
