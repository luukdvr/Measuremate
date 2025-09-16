$headers = @{
    "Authorization" = "Bearer da9104e0-f033-44bf-a572-2ba686e4f3dc"
    "Content-Type" = "application/json"
}

$body = '{"value": 35}'

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/sensor-data" -Method POST -Headers $headers -Body $body
    Write-Host "=== API RESPONSE ===" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}