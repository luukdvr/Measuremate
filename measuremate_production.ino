/*
 * IoT Dashboard Platform - Arduino UNO R4 DS18B20 Temperature Client
 */

#include <WiFiS3.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// =====================
// CONFIG
// =====================

const char* ssid = "Het Brouwershuys";
const char* password = "Wifi2021=Top@!";

const char* server = "measuremate.vercel.app"; // Production host
const int   port   = 443;
const char* apiPath = "/api/sensor-data";
const char* apiKey  = "afdc9782-b301-4953-9b2a-bbdd9f1ce7b1";

// =====================
// HARDWARE
// =====================

#define ONE_WIRE_BUS 4
#define TEMPERATURE_PRECISION 12
#define LED_PIN 13

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// HTTPS client
WiFiSSLClient client;
WiFiClient    clientPlain; // for HTTP health test

// =====================
// STATE
// =====================

float temperature = 0.0;
unsigned long lastMeasurementTime = 0;
unsigned long lastSendTime = 0;
const unsigned long measureInterval = 2000;
const unsigned long sendInterval    = 2000;

DeviceAddress sensorAddress;
bool sensorFound = false;

// =====================
// HELPERS
// =====================

bool waitForData(uint32_t timeoutMs = 5000) {
  uint32_t start = millis();
  while (!client.available() && (millis() - start) < timeoutMs) {
    delay(10);
  }
  return client.available();
}

int readHttpResponse(String& statusLineOut, String& bodyOut, uint32_t timeoutMs = 6000) {
  statusLineOut = "";
  bodyOut = "";

  if (!waitForData(timeoutMs)) return 0;

  statusLineOut = client.readStringUntil('\n');

  while (waitForData(timeoutMs)) {
    String line = client.readStringUntil('\n');
    if (line == "\r") break;
  }

  uint32_t lastAvail = millis();
  while (true) {
    while (client.available()) {
      char c = client.read();
      bodyOut += c;
      lastAvail = millis();
    }
    if (!client.connected() && !client.available()) break;
    if (millis() - lastAvail > timeoutMs) break;
    delay(5);
  }

  int code = 0;
  int space1 = statusLineOut.indexOf(' ');
  if (space1 >= 0 && statusLineOut.length() >= space1 + 4) {
    code = statusLineOut.substring(space1 + 1, space1 + 4).toInt();
  }
  return code;
}

void logDNS() {
  IPAddress ip;
  int ok = WiFi.hostByName(server, ip);
  Serial.print("DNS resolve ");
  Serial.print(server);
  Serial.print(" -> ");
  if (ok) {
    Serial.println(ip);
  } else {
    Serial.println("FAILED");
  }
}

// =====================
// WIFI
// =====================

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
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
    Serial.println("WiFi connected!");
    Serial.print("   SSID: "); Serial.println(WiFi.SSID());
    Serial.print("   IP: ");   Serial.println(WiFi.localIP());
    Serial.print("   RSSI: "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
    logDNS();
    Serial.println();
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
    delay(5000);
  }
}

// =====================
// SETUP
// =====================

void setup() {
  Serial.begin(115200);
  delay(2000);
  while (!Serial) {}

  Serial.println("IoT Dashboard DS18B20 Temperature Client (UNO R4)");
  Serial.println("=================================================");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  sensors.begin();

  int deviceCount = sensors.getDeviceCount();
  Serial.print("Found "); Serial.print(deviceCount); Serial.println(" temperature sensor(s)");
  if (deviceCount == 0) {
    Serial.println("No DS18B20 sensors found!");
    while (true) {
      digitalWrite(LED_PIN, (millis() / 500) % 2);
      delay(100);
    }
  }

  if (sensors.getAddress(sensorAddress, 0)) {
    sensorFound = true;
    sensors.setResolution(sensorAddress, TEMPERATURE_PRECISION);
  }

  connectToWiFi();

  lastMeasurementTime = millis();
  lastSendTime = millis();

  // Test verbindingen
  testApiConnection();
}

// =====================
// LOOP
// =====================

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    connectToWiFi();
    delay(500);
    return;
  }

  digitalWrite(LED_PIN, (millis() / 1000) % 2);

  if (millis() - lastMeasurementTime >= measureInterval) {
    lastMeasurementTime = millis();
    readTemperature();
  }

  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();
    sendTemperatureData();
  }

  delay(50);
}

// =====================
// SENSOR
// =====================

void readTemperature() {
  if (!sensorFound) return;

  sensors.requestTemperatures();
  float tempC = sensors.getTempC(sensorAddress);
  if (tempC == DEVICE_DISCONNECTED_C) {
    Serial.println("Temp read error");
    return;
  }

  temperature = tempC;
  Serial.print("Temperature: ");
  Serial.print(temperature, 2);
  Serial.println("°C");
}

// =====================
// API
// =====================

void sendTemperatureData() {
  Serial.println();
  Serial.println("Sending temperature data to IoT Dashboard...");

  client.stop(); // ensure clean session

  if (!client.connect(server, port)) {
    Serial.println("Connection to server failed");
    return;
  }
  Serial.println("Connected to server (TLS)");

  DynamicJsonDocument doc(128);
  doc["value"] = temperature;
  String jsonString;
  serializeJson(doc, jsonString);

  client.print(String("POST ") + apiPath + " HTTP/1.1\r\n");
  client.print(String("Host: ") + server + "\r\n"); // no :443
  client.print("User-Agent: UNO-R4-DS18B20/1.0\r\n");
  client.print("Content-Type: application/json\r\n");
  client.print(String("Authorization: Bearer ") + apiKey + "\r\n");
  client.print(String("Content-Length: ") + jsonString.length() + "\r\n");
  client.print("Connection: close\r\n\r\n");
  client.print(jsonString);

  String statusLine, body;
  int statusCode = readHttpResponse(statusLine, body, 8000);
  client.stop();

  Serial.print("Response: ");
  Serial.print(statusCode);
  Serial.print(" - ");
  if (statusCode == 201) {
    Serial.println("Success");
    digitalWrite(LED_PIN, HIGH); delay(100); digitalWrite(LED_PIN, LOW);
  } else {
    Serial.println("Failed");
    Serial.print("   Status: "); Serial.println(statusLine);
    Serial.print("   Body: ");   Serial.println(body);
  }

  Serial.println();
}

void testApiConnection() {
  Serial.println("Testing API connection (HTTPS)...");
  client.stop();
  if (client.connect(server, port)) {
    client.print("GET /api/health HTTP/1.1\r\n");
    client.print(String("Host: ") + server + "\r\n");
    client.print("User-Agent: UNO-R4-DS18B20/1.0\r\n");
    client.print("Accept: */*\r\n");
    client.print("Connection: close\r\n\r\n");

    String statusLine, body;
    int statusCode = readHttpResponse(statusLine, body, 8000);
    client.stop();

    Serial.print("HTTPS /api/health -> "); Serial.println(statusLine);
  } else {
    Serial.println("HTTPS connect() failed");
  }

  Serial.println("Testing API connection (HTTP:80)...");
  clientPlain.stop();
  if (clientPlain.connect(server, 80)) {
    clientPlain.print("GET /api/health HTTP/1.1\r\n");
    clientPlain.print(String("Host: ") + server + "\r\n");
    clientPlain.print("User-Agent: UNO-R4-DS18B20/1.0\r\n");
    clientPlain.print("Accept: */*\r\n");
    clientPlain.print("Connection: close\r\n\r\n");

    String status = clientPlain.readStringUntil('\n');
    Serial.print("HTTP /api/health -> "); Serial.println(status);
    clientPlain.stop();
  } else {
    Serial.println("HTTP connect() failed");
  }

  Serial.println();
}