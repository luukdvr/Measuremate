/*
 * IoT Dashboard Platform - Arduino Flowmeter Client
 * 
 * Deze code verzendt flowmeter data van een GL-136 stroomsnelheidssensor 
 * naar je eigen IoT Dashboard Platform via 4G/LTE verbinding.
 * 
 * Hardware:
 * - Arduino met SIM7600 LTE modem
 * - Stroomsnelheidssensor op pin 5
 * - Power control pins voor LTE module
 * 
 * Configuratie:
 * 1. Pas je API endpoint URL aan
 * 2. Voer je sensor API key in
 * 3. Upload naar Arduino
 */

#define TINY_GSM_MODEM_SIM7600

#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>

// ========================================
// CONFIGURATIE - PAS DEZE WAARDEN AAN
// ========================================

// Jouw IoT Dashboard Platform configuratie
const char* apiEndpoint = "jouw-app.vercel.app";  // Of "192.168.1.100" voor lokaal
const int apiPort = 443;  // 443 voor HTTPS, 3000 voor lokaal HTTP
const char* apiPath = "/api/sensor-data";
const char* apiKey = "a131a412-72ea-42cd-892d-32b58cc138fd";  // Jouw sensor API key

// Mobiele netwerkinstellingen
const char apn[] = "globaldata.iot";
const char user[] = "";
const char pass[] = "";

// ========================================
// HARDWARE CONFIGURATIE
// ========================================

// Flowmeter sensor
#define FLOW_PIN 5              // Digitale input voor flowmeterpulsen

// LTE-modem besturingspinnen
#define LTE_RESET_PIN 6
#define LTE_PWRKEY_PIN 5
#define LTE_FLIGHT_PIN 7

// ========================================
// VARIABELEN
// ========================================

// Flowmeter variabelen
volatile unsigned long pulseCount = 0;      // Teller voor flowmeterpulsen
float flowRate = 0.0;                       // Huidige flow rate in L/min
const float calibrationFactor = 0.5;        // Kalibratiefactor: 0.5 Hz = 1 L/min
unsigned long lastMeasurementTime = 0;      // Tijdstempel laatste meting
unsigned long lastSendTime = 0;             // Tijdstempel laatste data verzending
const unsigned long sendInterval = 30000;   // Verstuur elke 30 seconden

// Netwerk en connectiviteit
TinyGsm modem(Serial1);
TinyGsmClient client(modem);
HttpClient http(client, apiEndpoint, apiPort);

unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 60000; // Herverbind elke 60 seconden bij falen

// ========================================
// SETUP
// ========================================

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(100);

  Serial.println("🚀 IoT Dashboard Flowmeter Client Starting...");
  Serial.println("==========================================");
  
  // Initialiseer LTE module
  powerOnLTE();
  
  Serial1.begin(115200);
  delay(3000);

  Serial.println("📡 Initializing LTE modem...");
  if (!modem.restart()) {
    Serial.println("❌ Failed to restart modem");
    while (true) delay(1000);
  }

  String modemInfo = modem.getModemInfo();
  Serial.print("📱 Modem: ");
  Serial.println(modemInfo);

  Serial.println("🌐 Connecting to network...");
  if (!modem.gprsConnect(apn, user, pass)) {
    Serial.println("❌ Failed to connect to GPRS");
    while (true) delay(1000);
  }

  Serial.println("✅ Connected to network!");
  Serial.print("📍 IP address: ");
  Serial.println(modem.localIP());

  // Setup flowmeter sensor
  pinMode(FLOW_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), onFlowPulse, RISING);
  
  lastMeasurementTime = millis();
  lastSendTime = millis();

  Serial.println("🌊 Flowmeter sensor initialized");
  Serial.println("✅ Setup complete!");
  Serial.println();

  // Test API verbinding
  testApiConnection();
}

// ========================================
// MAIN LOOP
// ========================================

void loop() {
  // Check netwerk verbinding
  if (!modem.isNetworkConnected()) {
    Serial.println("❌ Network disconnected, reconnecting...");
    reconnectNetwork();
    return;
  }

  // Meet flow rate elke seconde
  if (millis() - lastMeasurementTime >= 1000) {
    lastMeasurementTime = millis();
    calculateFlowRate();
  }

  // Verstuur data naar API op interval
  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();
    sendFlowData();
  }

  delay(100); // Kleine delay voor stabiliteit
}

// ========================================
// FLOWMETER FUNCTIES
// ========================================

void calculateFlowRate() {
  // Lees pulsen veilig (interrupt bescherming)
  noInterrupts();
  unsigned long pulses = pulseCount;
  pulseCount = 0;
  interrupts();

  // Bereken flow rate
  float frequency = pulses; // Pulsen per seconde
  flowRate = frequency / calibrationFactor; // Flow in L/min

  // Toon debug informatie
  Serial.print("🌊 Flow: ");
  Serial.print(flowRate, 2);
  Serial.print(" L/min (");
  Serial.print(pulses);
  Serial.println(" pulses/sec)");
}

// Interrupt handler voor flowmeter pulsen
void onFlowPulse() {
  pulseCount++;
}

// ========================================
// API COMMUNICATIE
// ========================================

void sendFlowData() {
  Serial.println();
  Serial.println("📡 Sending flow data to IoT Dashboard...");
  
  // Maak JSON payload
  DynamicJsonDocument doc(256);
  doc["value"] = flowRate;
  doc["timestamp"] = getISO8601Timestamp();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("📦 Payload: ");
  Serial.println(jsonString);

  // Setup HTTP request
  http.beginRequest();
  http.post(apiPath);
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Authorization", String("Bearer ") + apiKey);
  http.sendHeader("Content-Length", jsonString.length());
  http.beginBody();
  http.print(jsonString);
  http.endRequest();

  // Lees response
  int statusCode = http.responseStatusCode();
  String response = http.responseBody();

  Serial.print("📬 Response: ");
  Serial.print(statusCode);
  Serial.print(" - ");
  
  if (statusCode == 201) {
    Serial.println("✅ Success!");
    
    // Parse response voor details
    DynamicJsonDocument responseDoc(512);
    deserializeJson(responseDoc, response);
    
    if (responseDoc["success"]) {
      Serial.print("   📊 Sensor: ");
      Serial.println(responseDoc["data"]["sensor_name"].as<String>());
      Serial.print("   🌊 Value: ");
      Serial.print(responseDoc["data"]["value"].as<float>());
      Serial.println(" L/min");
      Serial.print("   ⏰ Time: ");
      Serial.println(responseDoc["data"]["timestamp"].as<String>());
    }
  } else {
    Serial.println("❌ Failed!");
    Serial.print("   Error: ");
    Serial.println(response);
  }
  
  Serial.println();
}

void testApiConnection() {
  Serial.println("🔍 Testing API connection...");
  
  http.beginRequest();
  http.get("/api/health");
  http.endRequest();
  
  int statusCode = http.responseStatusCode();
  String response = http.responseBody();
  
  if (statusCode == 200) {
    Serial.println("✅ API connection successful!");
    Serial.print("   Response: ");
    Serial.println(response);
  } else {
    Serial.println("❌ API connection failed!");
    Serial.print("   Status: ");
    Serial.println(statusCode);
    Serial.print("   Response: ");
    Serial.println(response);
  }
  Serial.println();
}

// ========================================
// LTE MODULE FUNCTIES
// ========================================

void powerOnLTE() {
  Serial.println("⚡ Powering on LTE module...");
  
  pinMode(LTE_RESET_PIN, OUTPUT);
  digitalWrite(LTE_RESET_PIN, LOW);

  pinMode(LTE_PWRKEY_PIN, OUTPUT);
  digitalWrite(LTE_PWRKEY_PIN, LOW);
  delay(100);
  digitalWrite(LTE_PWRKEY_PIN, HIGH);
  delay(2000);
  digitalWrite(LTE_PWRKEY_PIN, LOW);

  pinMode(LTE_FLIGHT_PIN, OUTPUT);
  digitalWrite(LTE_FLIGHT_PIN, LOW);
  
  delay(3000);
}

void reconnectNetwork() {
  if (millis() - lastReconnectAttempt < reconnectInterval) {
    return; // Nog niet tijd voor herverbinding
  }
  
  lastReconnectAttempt = millis();
  
  Serial.println("🔄 Reconnecting to network...");
  
  // Herstart modem
  powerOnLTE();
  delay(3000);
  
  if (!modem.restart()) {
    Serial.println("❌ Modem restart failed");
    return;
  }
  
  if (!modem.gprsConnect(apn, user, pass)) {
    Serial.println("❌ GPRS reconnect failed");
    return;
  }
  
  Serial.println("✅ Reconnected successfully!");
  
  // Heractiveer interrupt
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), onFlowPulse, RISING);
}

// ========================================
// UTILITY FUNCTIES
// ========================================

String getISO8601Timestamp() {
  // Voor eenvoud gebruiken we epoch time
  // In productie zou je NTP tijd kunnen gebruiken
  unsigned long epochTime = millis() / 1000;
  return String(epochTime);
}

// ========================================
// DEBUG EN MONITORING
// ========================================

void printSystemStatus() {
  Serial.println("📊 System Status:");
  Serial.print("   Network: ");
  Serial.println(modem.isNetworkConnected() ? "Connected" : "Disconnected");
  Serial.print("   Signal: ");
  Serial.println(modem.getSignalQuality());
  Serial.print("   IP: ");
  Serial.println(modem.localIP());
  Serial.print("   Flow Rate: ");
  Serial.print(flowRate);
  Serial.println(" L/min");
  Serial.print("   Uptime: ");
  Serial.print(millis() / 1000);
  Serial.println(" seconds");
  Serial.println();
}
