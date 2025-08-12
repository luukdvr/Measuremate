# Arduino DS18B20 Temperature Sensor Setup

Deze bestanden bevatten Arduino code om DS18B20 temperatuur sensoren te verbinden met je MeasureMate IoT platform op **https://measuremate.vercel.app/**

## Beschikbare Versies

### 1. Arduino UNO R4 WiFi (`arduino_temperature_uno_r4.ino`)
- Voor Arduino UNO R4 WiFi boards
- Gebruikt WiFiS3 library (ingebouwd)
- HTTPS verbinding met SSL

### 2. ESP32 (`arduino_temperature_esp32.ino`) 
- Voor ESP32 development boards
- Gebruikt WiFi en HTTPClient libraries (ingebouwd)
- HTTPS verbinding

## Hardware Setup

### Benodigde Onderdelen
- Arduino UNO R4 WiFi of ESP32
- DS18B20 digitale temperatuur sensor
- 4.7kΩ weerstand (pull-up)
- Breadboard en jumper wires

### Aansluitingen
```
DS18B20 Pin    Arduino Pin    ESP32 Pin
-----------    -----------    ---------
VCC           3.3V of 5V     3.3V
GND           GND            GND  
DATA          Pin 4          GPIO 4
```

**Belangrijk**: Plaats een 4.7kΩ pull-up weerstand tussen de DATA pin en VCC.

## Software Setup

### 1. Installeer Required Libraries
Via Arduino IDE Library Manager:
- **ArduinoJson** (versie 6.x)
- **OneWire**
- **DallasTemperature**

### 2. Configureer de Code
Open het juiste `.ino` bestand en pas deze waarden aan:

```cpp
// WiFi credentials
const char* ssid = "JE_WIFI_NAAM";
const char* password = "JE_WIFI_WACHTWOORD";

// API Key van MeasureMate dashboard
const char* apiKey = "je-api-key-hier";
```

### 3. Verkrijg je API Key
1. Ga naar https://measuremate.vercel.app/
2. Log in of maak een account
3. Klik op "Nieuwe Sensor Toevoegen"
4. Kies een naam (bijvoorbeeld "Woonkamer Temperatuur")
5. Kopieer de gegenereerde API key

## Upload en Test

### 1. Upload Code
1. Sluit je Arduino/ESP32 aan via USB
2. Selecteer het juiste board type in Arduino IDE
3. Selecteer de juiste COM poort
4. Upload de code

### 2. Monitor Serial Output
Open Serial Monitor (115200 baud) om te zien:
```
=== MeasureMate DS18B20 Temperature Sensor ===
Temperature sensor initialized. Found 1 devices.
WiFi connected successfully!
IP address: 192.168.1.100

[30s] Temperature: 22.50°C ✓ Data sent successfully
[60s] Temperature: 22.75°C ✓ Data sent successfully
```

### 3. Controleer Dashboard
- Ga naar https://measuremate.vercel.app/
- Je sensor zou nu data moeten tonen
- Temperatuur wordt elke 30 seconden bijgewerkt

## Troubleshooting

### WiFi Problemen
- Controleer SSID en wachtwoord
- Zorg dat 2.4GHz WiFi beschikbaar is (ESP32 ondersteunt geen 5GHz)
- Controleer signal strength in Serial Monitor

### Sensor Problemen
- Controleer bedrading en pull-up weerstand
- DS18B20 kan defect zijn als temperature = -127°C
- Probeer een andere GPIO pin

### API Problemen
- Controleer of API key correct is
- Kijk in Serial Monitor voor HTTP error codes
- Controleer of sensor bestaat in MeasureMate dashboard

### Veelvoorkomende Error Codes
- **HTTP 401**: Ongeldige API key
- **HTTP 404**: Sensor niet gevonden
- **HTTP 500**: Server error

## Aanpassen Instellingen

### Meet Interval Wijzigen
```cpp
const unsigned long readingInterval = 60000; // 60 seconden
```

### GPIO Pin Wijzigen
```cpp
#define TEMPERATURE_PIN 5  // Gebruik GPIO 5 in plaats van 4
```

## Support
Voor vragen of problemen kun je een issue aanmaken in de GitHub repository of contact opnemen via het MeasureMate platform.

**Production URL**: https://measuremate.vercel.app/
**Hardware**: DS18B20 Digital Temperature Sensor
**Platforms**: Arduino UNO R4 WiFi, ESP32
