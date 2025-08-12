@echo off
echo 🔍 Testing IoT Dashboard API Connection...
echo.

echo 📍 Your IP address:
ipconfig | findstr "IPv4 Address" | findstr "192.168"
echo.

echo 🏃 Starting development server...
echo Open another Command Prompt and run: npm run dev
echo.

echo 📡 Testing API endpoints...
timeout /t 5 /nobreak > nul

echo.
echo 🌡️ Testing health endpoint:
curl -X GET http://192.168.88.155:3000/api/health
echo.

echo.
echo 🌡️ Testing sensor data endpoint with your API key:
curl -X POST http://192.168.88.155:3000/api/sensor-data ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer a131a412-72ea-42cd-892d-32b58cc138fd" ^
  -d "{\"value\":25.5,\"timestamp\":\"2025-08-12T13:30:00Z\"}"

echo.
echo.
echo 📝 Update your Arduino code with:
echo const char* server = "192.168.88.155";
echo.
pause
