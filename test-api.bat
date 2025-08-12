@echo off
echo 🚀 Testing IoT Dashboard API...
echo.

REM Test health endpoint
echo 🏥 Testing health endpoint...
curl -s http://localhost:3000/api/health
echo.
echo.

REM Test sensor data endpoint
echo 📡 Sending sensor data...
echo API Key: a131a412-72ea-42cd-892d-32b58cc138fd
echo Value: 23.5
echo.

curl -X POST http://localhost:3000/api/sensor-data ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer a131a412-72ea-42cd-892d-32b58cc138fd" ^
  -d "{\"value\": 23.5}"

echo.
echo.
echo ✅ Test completed!
pause
