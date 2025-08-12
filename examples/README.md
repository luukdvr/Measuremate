# Arduino Sensor Integration

Deze directory bevat Arduino code om je sensoren te verbinden met je IoT Dashboard Platform.

## 📁 Bestanden

**Stroomsnelheidssensor (4G):**
- `arduino_flowmeter_4g.ino` - Voor 4G/LTE verbinding met stroomsnelheidssensor (SIM7600)

**Temperatuursensor (WiFi):**
- `arduino_temperature_esp32.ino` - Voor ESP32 met DS18B20 temperatuursensor
- `arduino_temperature_uno.ino` - Voor Arduino UNO/Nano met WiFi shield en DS18B20

**Simulators:**
- `flowmeter_simulator.js` - Simulator voor stroomsnelheidssensor
- `temperature_simulator.js` - Simulator voor DS18B20 temperatuursensor

## 🛠️ Hardware Setup

### Voor 4G Versie (SIM7600):
- Arduino board
- SIM7600 LTE module
- Stroomsnelheidssensor (flowmeter)
- SIM kaart met data plan

**Pinout:**
```
Flowmeter -> Pin 5 (digitale input)
LTE Reset -> Pin 6
LTE Power -> Pin 5  
LTE Flight -> Pin 7
```

### Voor WiFi Versie (DS18B20 Temperatuur):

**ESP32 (`arduino_temperature_esp32.ino`):**
- ESP32 development board
- DS18B20 digitale temperatuursensor
- 4.7kΩ pull-up resistor

**Arduino UNO/Nano (`arduino_temperature_uno.ino`):**
- Arduino UNO of Nano
- ESP8266 WiFi module of WiFi shield
- DS18B20 digitale temperatuursensor
- 4.7kΩ pull-up resistor

**Pinout (beide versies):**
```
DS18B20 VCC  -> 3.3V (of 5V voor UNO)
DS18B20 GND  -> GND  
DS18B20 DATA -> Pin 4
4.7kΩ resistor tussen DATA en VCC
Status LED   -> Pin 2 (ESP32) of Pin 13 (UNO)

Voor UNO met ESP8266:
ESP8266 RX   -> Pin 2
ESP8266 TX   -> Pin 3
```

## ⚙️ Configuratie

### Stap 1: Sensor aanmaken in Dashboard

1. Ga naar je dashboard: `http://localhost:3000/dashboard`
2. Klik op "Nieuwe Sensor Toevoegen"
3. Voer een naam in zoals "Stroomsnelheid Sensor" of "Temperatuur Sensor"
4. Kopieer de gegenereerde API key

### Stap 2: Arduino Code Aanpassen

**Voor 4G versie (`arduino_flowmeter_4g.ino`):**
```cpp
// Pas deze waarden aan:
const char* apiEndpoint = "jouw-app.vercel.app";  // Of je lokale IP
const char* apiKey = "JOUW_API_KEY_HIER";        // Van stap 1
const char apn[] = "jouw-provider-apn";          // Provider APN
```

**Voor WiFi versie - ESP32 (`arduino_temperature_esp32.ino`):**
```cpp
// Pas deze waarden aan:
const char* ssid = "JouwWiFiNaam";
const char* password = "JouwWiFiWachtwoord";
const char* apiUrl = "http://192.168.1.100:3000/api/sensor-data";  // Jouw lokale IP
const char* apiKey = "JOUW_API_KEY_HIER";        // Van stap 1
```

**Voor WiFi versie - Arduino UNO (`arduino_temperature_uno.ino`):**
```cpp
// Pas deze waarden aan:
const char* ssid = "JouwWiFiNaam";
const char* password = "JouwWiFiWachtwoord";
const char* server = "192.168.1.100";           // Jouw lokale IP (zonder http://)
const int port = 3000;
const char* apiKey = "JOUW_API_KEY_HIER";        // Van stap 1
```

### Stap 3: Libraries Installeren

In Arduino IDE ga naar **Tools > Manage Libraries** en installeer:

**Voor 4G versie:**
- `TinyGSM` (voor LTE modem)
- `ArduinoHttpClient` (voor HTTP requests)
- `ArduinoJson` (voor JSON handling)

**Voor WiFi versie - ESP32:**
- `ArduinoJson` (voor JSON handling)
- `OneWire` (voor DS18B20 communicatie)
- `DallasTemperature` (voor DS18B20 sensor)
- ESP32 WiFi & HTTPClient libraries (ingebouwd)

**Voor WiFi versie - Arduino UNO:**
- `ArduinoJson` (voor JSON handling)
- `OneWire` (voor DS18B20 communicatie)
- `DallasTemperature` (voor DS18B20 sensor)
- `WiFiEsp` (voor ESP8266 shield) of `WiFi101` (voor MKR WiFi)

### Stap 4: Code Uploaden

1. Selecteer je board type in Arduino IDE
2. Selecteer de juiste COM poort
3. Upload de code naar je Arduino

## 📊 Sensor Kalibratie

### Flowmeter (4G versie):
De flowmeter kalibratie staat ingesteld op:
```cpp
const float calibrationFactor = 0.5;  // 0.5 Hz = 1 L/min
```

**Kalibratie aanpassen:**
1. Meet de werkelijke flow met een bekende hoeveelheid water
2. Tel de pulsen over een bepaalde tijd
3. Bereken: `calibrationFactor = pulsen_per_seconde / flow_in_liters_per_minuut`

### DS18B20 Temperatuur (WiFi versie):
De DS18B20 is fabrieksgekalibreerd, maar je kunt de resolutie aanpassen:
```cpp
#define TEMPERATURE_PRECISION 12  // 9, 10, 11, of 12 bits
```

**Resolutie opties:**
- 9 bits: 0.5°C resolutie, 94ms conversietijd
- 10 bits: 0.25°C resolutie, 188ms conversietijd  
- 11 bits: 0.125°C resolutie, 375ms conversietijd
- 12 bits: 0.0625°C resolutie, 750ms conversietijd

## 🔧 Troubleshooting

### Probleem: Arduino kan niet verbinden met API

**Oplossing:**
1. Check je WiFi/4G verbinding
2. Controleer of je API URL klopt
3. Test lokaal met: `curl -X POST http://localhost:3000/api/sensor-data`

### Probleem: "Invalid API key" error

**Oplossing:**
1. Controleer of de API key correct is gekopieerd
2. Check of de sensor bestaat in je dashboard
3. Test de API key met: 
```bash
curl -H "Authorization: Bearer JOUW_API_KEY" http://localhost:3000/api/sensor-data
```

### Probleem: HTTPClient.h not found

**Dit gebeurt als je:**
- Arduino UNO/Nano gebruikt in plaats van ESP32
- De verkeerde code versie hebt gedownload

**Oplossing:**
1. **Voor ESP32**: Gebruik `arduino_temperature_esp32.ino`
2. **Voor Arduino UNO/Nano**: Gebruik `arduino_temperature_uno.ino`
3. Check je board selectie in Arduino IDE (Tools > Board)

### Probleem: Geen temperatuur gelezen

**Oplossing:**
1. Check DS18B20 bedrading (4.7kΩ pull-up resistor!)
2. Test sensor met multimeter: VCC = 3.3V/5V, GND = 0V
3. Controleer of pin 4 verbonden is met DATA pin
4. Probeer andere DS18B20 sensor (defect?)

### Probleem: 4G verbinding faalt

**Oplossing:**
1. Check SIM kaart en data plan
2. Controleer APN instellingen
3. Test signaalsterkte op locatie

## 📈 Data Monitoring

### Serial Monitor
Open de Serial Monitor (115200 baud) om debug info te zien:
```
🚀 IoT Dashboard Flowmeter Client Starting...
📡 Initializing LTE modem...
✅ Connected to network!
🌊 Flow: 2.34 L/min (1 pulses/sec)
📡 Sending flow data to IoT Dashboard...
✅ Success!
```

### Dashboard
Ga naar `http://localhost:3000/dashboard` om je live data te zien in grafieken.

## 🔄 Data Interval

Standaard wordt elke 30 seconden data verstuurd. Aanpassen:
```cpp
const unsigned long sendInterval = 30000;  // milliseconden
```

**Aanbevolen intervallen:**
- Test/ontwikkeling: 10-30 seconden
- Productie: 1-5 minuten (voor batterij/data besparing)

## 📝 API Response Format

Succesvolle response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sensor_name": "Stroomsnelheid Sensor",
    "value": 2.34,
    "timestamp": "2025-07-29T10:30:00Z"
  }
}
```

## 🚀 Volgende Stappen

1. **Test lokaal**: Zorg dat data binnenkomt in je dashboard
2. **Deploy to Vercel**: Upload je project naar productie
3. **Update Arduino**: Pas API URL aan naar productie URL
4. **Monitoring**: Setup alerting voor sensor downtime
5. **Kalibratie**: Fine-tune de sensor kalibratie met echte metingen
