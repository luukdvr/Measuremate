'use client'

import { useState } from 'react'
import { useDashboard } from '@/components/dashboard/DashboardShell'
import { Copy, Check } from 'lucide-react'

export default function ApiDocsPage() {
  useDashboard()
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedBlock(id)
    setTimeout(() => setCopiedBlock(null), 2000)
  }

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative mt-2">
      <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
      <button
        onClick={() => copyCode(code, id)}
        className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
      >
        {copiedBlock === id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">API Documentatie</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Alles wat je nodig hebt om je device te koppelen
        </p>
      </div>

      {/* Quick Start */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Start</h3>
        <ol className="list-decimal list-inside space-y-3 text-sm text-slate-700 dark:text-slate-300">
          <li>Maak een Measuremate aan in het dashboard</li>
          <li>Voeg een sensor toe en kopieer de API key</li>
          <li>Stuur data met een HTTP POST request (zie hieronder)</li>
          <li>Bekijk de data direct in je dashboard</li>
        </ol>
      </div>

      {/* POST sensor-data */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-mono rounded mr-2">POST</span>
          /api/sensor-data
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Stuur een sensorwaarde op. Authenticatie via Bearer token (de API key van de sensor).
        </p>

        <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-1">Headers</h4>
        <CodeBlock id="headers" code={`Content-Type: application/json
Authorization: Bearer <SENSOR_API_KEY>`} />

        <h4 className="text-sm font-medium text-slate-900 dark:text-white mt-4 mb-1">Request Body</h4>
        <CodeBlock id="body" code={`{
  "value": 23.5,
  "timestamp": "2026-01-15T12:00:00Z"  // optioneel
}`} />

        <h4 className="text-sm font-medium text-slate-900 dark:text-white mt-4 mb-1">Response (201)</h4>
        <CodeBlock id="response" code={`{
  "success": true,
  "data": {
    "id": "uuid",
    "sensor_id": "uuid",
    "sensor_name": "pH Sensor",
    "value": 23.5,
    "timestamp": "2026-01-15T12:00:00Z"
  }
}`} />

        <h4 className="text-sm font-medium text-slate-900 dark:text-white mt-4 mb-1">curl voorbeeld</h4>
        <CodeBlock id="curl" code={`curl -X POST ${baseUrl}/api/sensor-data \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer JOUW_API_KEY" \\
  -d '{"value": 23.5}'`} />
      </div>

      {/* GET sensor-data */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded mr-2">GET</span>
          /api/sensor-data
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Haal sensordata op. Vereist een ingelogde sessie.
        </p>

        <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-1">Parameters</h4>
        <div className="mt-2 space-y-2 text-sm">
          <div className="flex gap-3 p-2 rounded bg-slate-50 dark:bg-slate-800">
            <code className="text-blue-600 dark:text-blue-400 font-mono">sensor_id</code>
            <span className="text-slate-500">required — UUID van de sensor</span>
          </div>
          <div className="flex gap-3 p-2 rounded bg-slate-50 dark:bg-slate-800">
            <code className="text-blue-600 dark:text-blue-400 font-mono">limit</code>
            <span className="text-slate-500">optional — max aantal records (default: 50)</span>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded mr-2">GET</span>
          /api/export
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Exporteer sensordata als CSV of JSON. Vereist een ingelogde sessie.
        </p>

        <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-1">Parameters</h4>
        <div className="mt-2 space-y-2 text-sm">
          <div className="flex gap-3 p-2 rounded bg-slate-50 dark:bg-slate-800">
            <code className="text-blue-600 dark:text-blue-400 font-mono">sensor_id</code>
            <span className="text-slate-500">required — UUID van de sensor</span>
          </div>
          <div className="flex gap-3 p-2 rounded bg-slate-50 dark:bg-slate-800">
            <code className="text-blue-600 dark:text-blue-400 font-mono">from</code>
            <span className="text-slate-500">optional — startdatum (ISO 8601)</span>
          </div>
          <div className="flex gap-3 p-2 rounded bg-slate-50 dark:bg-slate-800">
            <code className="text-blue-600 dark:text-blue-400 font-mono">to</code>
            <span className="text-slate-500">optional — einddatum (ISO 8601)</span>
          </div>
          <div className="flex gap-3 p-2 rounded bg-slate-50 dark:bg-slate-800">
            <code className="text-blue-600 dark:text-blue-400 font-mono">format</code>
            <span className="text-slate-500">optional — csv of json (default: csv)</span>
          </div>
        </div>
      </div>

      {/* Arduino Example */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Arduino Voorbeeld (ESP32)</h3>
        <CodeBlock id="arduino" code={`#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "JOUW_WIFI";
const char* password = "JOUW_WACHTWOORD";
const char* apiKey = "JOUW_API_KEY";
const char* serverUrl = "${baseUrl}/api/sensor-data";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Verbinden...");
  }
  Serial.println("Verbonden!");
}

void loop() {
  float sensorValue = analogRead(A0) * 0.1; // Pas aan voor jouw sensor

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + apiKey);

    String payload = "{\\"value\\":" + String(sensorValue, 2) + "}";
    int httpCode = http.POST(payload);

    Serial.println("Status: " + String(httpCode));
    http.end();
  }

  delay(60000); // Elke minuut
}`} />
      </div>

      {/* Health endpoint */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded mr-2">GET</span>
          /api/health
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Controleer of de API beschikbaar is. Geen authenticatie vereist.
        </p>
      </div>
    </div>
  )
}
