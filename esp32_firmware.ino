/* =========================================================
   ONEFORGE CUBESAT — ESP32 REFERENCE FIRMWARE
   =========================================================

   PURPOSE:
   Wi-Fi Access Point + HTTP Telemetry Server

   NETWORK:
   SSID: OneForge-CubeSat
   IP:   192.168.4.1

   API:
   GET  /api/telemetry   → JSON telemetry
   POST /api/command      → command handler (stub)

   SENSORS:
   MPU6050  (I2C 0x68) — Accelerometer + Gyroscope
   BMP280   (I2C 0x76) — Temperature + Pressure

   POWER:
   Analog voltage divider on GPIO 34
   Analog current sense on GPIO 35

   INDICATORS:
   Green LED   — GPIO 25 (NORMAL)
   Yellow LED  — GPIO 26 (WARNING)
   Red LED     — GPIO 27 (CRITICAL)
   Buzzer      — GPIO 32

   IMPORTANT:
   This is a PROTOTYPE firmware for ground demonstration.
   Do NOT claim flight-qualified or space-qualified.

   LIBRARIES REQUIRED:
   - WiFi.h (built-in)
   - WebServer.h (built-in)
   - Wire.h (built-in)
   - Adafruit_MPU6050
   - Adafruit_BMP280
   - ArduinoJson

   Install via Arduino Library Manager:
   1. Adafruit MPU6050
   2. Adafruit BMP280
   3. ArduinoJson (by Benoit Blanchon)
   ========================================================= */


#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>


/* =========================================================
   CONFIGURATION
   ========================================================= */

// Wi-Fi Access Point
const char* AP_SSID     = "OneForge-CubeSat";
const char* AP_PASSWORD = "";  // Open network for prototype

// Device
const char* DEVICE_ID        = "ONEFORGE-CUBESAT-01";
const char* FIRMWARE_VERSION = "1.0.0";

// Pins
#define PIN_VOLTAGE   34
#define PIN_CURRENT   35
#define PIN_LED_GREEN  25
#define PIN_LED_YELLOW 26
#define PIN_LED_RED    27
#define PIN_BUZZER     32
#define PIN_BUTTON_1   33
#define PIN_BUTTON_2   14

// Thresholds
#define TEMP_WARNING_HIGH   38.0
#define TEMP_CRITICAL_HIGH  45.0
#define VOLTAGE_WARNING_LOW  3.3
#define VOLTAGE_CRITICAL_LOW 3.0
#define CURRENT_WARNING_HIGH 0.6
#define CURRENT_CRITICAL_HIGH 1.0

// Voltage divider calibration
// Adjust these for your actual voltage divider
#define VOLTAGE_DIVIDER_RATIO  2.0
#define ADC_REFERENCE          3.3
#define ADC_RESOLUTION         4095.0

// Current sensor calibration
// ACS712-05B: 185 mV/A, zero-point at VCC/2
#define CURRENT_SENSOR_SENSITIVITY 0.185
#define CURRENT_SENSOR_OFFSET      1.65


/* =========================================================
   GLOBALS
   ========================================================= */

WebServer server(80);

Adafruit_MPU6050 mpu;
Adafruit_BMP280 bmp;

bool mpuAvailable  = false;
bool bmpAvailable  = false;

unsigned long startTime = 0;

// Telemetry data
float temperature = 0;
float pressure    = 0;

float accelX = 0, accelY = 0, accelZ = 0;
float gyroX  = 0, gyroY  = 0, gyroZ  = 0;

float voltage = 0;
float current = 0;
float power   = 0;

String healthStatus = "NORMAL";

bool   faultActive   = false;
String faultType     = "";
String faultSeverity = "";


/* =========================================================
   SETUP
   ========================================================= */

void setup() {

    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("=== ONEFORGE CUBESAT ===");
    Serial.println();


    /* -----------------------------------------
       GPIO
       ----------------------------------------- */

    pinMode(PIN_LED_GREEN,  OUTPUT);
    pinMode(PIN_LED_YELLOW, OUTPUT);
    pinMode(PIN_LED_RED,    OUTPUT);
    pinMode(PIN_BUZZER,     OUTPUT);
    pinMode(PIN_BUTTON_1,   INPUT_PULLUP);
    pinMode(PIN_BUTTON_2,   INPUT_PULLUP);

    // Initial state — green
    digitalWrite(PIN_LED_GREEN,  HIGH);
    digitalWrite(PIN_LED_YELLOW, LOW);
    digitalWrite(PIN_LED_RED,    LOW);
    digitalWrite(PIN_BUZZER,     LOW);


    /* -----------------------------------------
       I2C SENSORS
       ----------------------------------------- */

    Wire.begin();

    // MPU6050
    if (mpu.begin()) {
        mpuAvailable = true;
        mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
        mpu.setGyroRange(MPU6050_RANGE_250_DEG);
        mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
        Serial.println("MPU6050: OK");
    } else {
        Serial.println("MPU6050: NOT FOUND");
    }

    // BMP280
    if (bmp.begin(0x76)) {
        bmpAvailable = true;
        bmp.setSampling(
            Adafruit_BMP280::MODE_NORMAL,
            Adafruit_BMP280::SAMPLING_X2,
            Adafruit_BMP280::SAMPLING_X16,
            Adafruit_BMP280::FILTER_X16,
            Adafruit_BMP280::STANDBY_MS_500
        );
        Serial.println("BMP280: OK");
    } else {
        Serial.println("BMP280: NOT FOUND");
    }


    /* -----------------------------------------
       Wi-Fi ACCESS POINT
       ----------------------------------------- */

    WiFi.softAP(AP_SSID, AP_PASSWORD);

    Serial.println();
    Serial.println("Wi-Fi Access Point Started");
    Serial.print("Network: ");
    Serial.println(AP_SSID);
    Serial.print("IP Address: ");
    Serial.println(WiFi.softAPIP());
    Serial.println();


    /* -----------------------------------------
       HTTP SERVER
       ----------------------------------------- */

    // CORS preflight
    server.on("/api/telemetry", HTTP_OPTIONS, handleCORS);
    server.on("/api/command",   HTTP_OPTIONS, handleCORS);

    // API endpoints
    server.on("/api/telemetry", HTTP_GET,  handleTelemetry);
    server.on("/api/command",   HTTP_POST, handleCommand);

    // Root — simple info page
    server.on("/", HTTP_GET, handleRoot);

    server.begin();

    Serial.println("HTTP Server started on port 80");
    Serial.println();

    startTime = millis();
}


/* =========================================================
   LOOP
   ========================================================= */

void loop() {

    server.handleClient();

    readSensors();

    evaluateHealth();

    updateLEDs();

    delay(100);  // 10 Hz sensor update
}


/* =========================================================
   SENSOR READING
   ========================================================= */

void readSensors() {

    // MPU6050
    if (mpuAvailable) {

        sensors_event_t a, g, temp_event;
        mpu.getEvent(&a, &g, &temp_event);

        accelX = a.acceleration.x;
        accelY = a.acceleration.y;
        accelZ = a.acceleration.z;

        gyroX = g.gyro.x * (180.0 / PI);  // Convert to °/s
        gyroY = g.gyro.y * (180.0 / PI);
        gyroZ = g.gyro.z * (180.0 / PI);
    }

    // BMP280
    if (bmpAvailable) {
        temperature = bmp.readTemperature();
        pressure    = bmp.readPressure() / 100.0;  // Convert Pa to hPa
    }

    // Voltage (analog)
    int rawVoltage = analogRead(PIN_VOLTAGE);
    voltage = (rawVoltage / ADC_RESOLUTION) *
              ADC_REFERENCE * VOLTAGE_DIVIDER_RATIO;

    // Current (analog)
    int rawCurrent = analogRead(PIN_CURRENT);
    float currentVoltage = (rawCurrent / ADC_RESOLUTION) * ADC_REFERENCE;
    current = (currentVoltage - CURRENT_SENSOR_OFFSET) /
              CURRENT_SENSOR_SENSITIVITY;

    if (current < 0) current = 0;

    // Power
    power = voltage * current;
}


/* =========================================================
   HEALTH EVALUATION
   ========================================================= */

void evaluateHealth() {

    faultActive   = false;
    faultType     = "";
    faultSeverity = "";
    healthStatus  = "NORMAL";


    // Temperature checks
    if (temperature >= TEMP_CRITICAL_HIGH) {

        healthStatus  = "CRITICAL";
        faultActive   = true;
        faultType     = "HIGH_TEMPERATURE";
        faultSeverity = "CRITICAL";

    } else if (temperature >= TEMP_WARNING_HIGH) {

        healthStatus  = "WARNING";
        faultActive   = true;
        faultType     = "HIGH_TEMPERATURE";
        faultSeverity = "WARNING";
    }

    // Voltage checks
    if (voltage <= VOLTAGE_CRITICAL_LOW && voltage > 0) {

        healthStatus  = "CRITICAL";
        faultActive   = true;
        faultType     = "LOW_VOLTAGE";
        faultSeverity = "CRITICAL";

    } else if (voltage <= VOLTAGE_WARNING_LOW && voltage > 0) {

        if (healthStatus != "CRITICAL") {
            healthStatus = "WARNING";
        }
        faultActive   = true;
        faultType     = "LOW_VOLTAGE";
        faultSeverity = "WARNING";
    }

    // Current checks
    if (current >= CURRENT_CRITICAL_HIGH) {

        healthStatus  = "CRITICAL";
        faultActive   = true;
        faultType     = "ABNORMAL_CURRENT";
        faultSeverity = "CRITICAL";

    } else if (current >= CURRENT_WARNING_HIGH) {

        if (healthStatus != "CRITICAL") {
            healthStatus = "WARNING";
        }
        faultActive   = true;
        faultType     = "ABNORMAL_CURRENT";
        faultSeverity = "WARNING";
    }
}


/* =========================================================
   LED INDICATORS
   ========================================================= */

void updateLEDs() {

    if (healthStatus == "CRITICAL") {

        digitalWrite(PIN_LED_GREEN,  LOW);
        digitalWrite(PIN_LED_YELLOW, LOW);
        digitalWrite(PIN_LED_RED,    HIGH);

    } else if (healthStatus == "WARNING") {

        digitalWrite(PIN_LED_GREEN,  LOW);
        digitalWrite(PIN_LED_YELLOW, HIGH);
        digitalWrite(PIN_LED_RED,    LOW);

    } else {

        digitalWrite(PIN_LED_GREEN,  HIGH);
        digitalWrite(PIN_LED_YELLOW, LOW);
        digitalWrite(PIN_LED_RED,    LOW);
    }
}


/* =========================================================
   CORS HANDLER
   ========================================================= */

void sendCORSHeaders() {

    server.sendHeader("Access-Control-Allow-Origin",  "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
    server.sendHeader("Access-Control-Max-Age",       "86400");
}

void handleCORS() {

    sendCORSHeaders();
    server.send(204);
}


/* =========================================================
   GET /api/telemetry
   ========================================================= */

void handleTelemetry() {

    sendCORSHeaders();

    StaticJsonDocument<512> doc;

    doc["deviceId"]    = DEVICE_ID;
    doc["timestamp"]   = (unsigned long)(millis() / 1000) + 1700000000UL;

    doc["temperature"] = round2(temperature);
    doc["pressure"]    = round2(pressure);

    JsonObject accel = doc.createNestedObject("accel");
    accel["x"] = round2(accelX);
    accel["y"] = round2(accelY);
    accel["z"] = round2(accelZ);

    JsonObject gyro = doc.createNestedObject("gyro");
    gyro["x"] = round1(gyroX);
    gyro["y"] = round1(gyroY);
    gyro["z"] = round1(gyroZ);

    doc["voltage"] = round2(voltage);
    doc["current"] = round2(current);
    doc["power"]   = round2(power);

    doc["health"] = healthStatus;

    JsonObject fault = doc.createNestedObject("fault");
    fault["active"]   = faultActive;
    fault["type"]     = faultActive ? faultType : (const char*)NULL;
    fault["severity"] = faultActive ? faultSeverity : (const char*)NULL;

    JsonObject sys = doc.createNestedObject("system");
    sys["uptime"]   = (unsigned long)(millis() - startTime) / 1000;
    sys["wifiRssi"] = 0;  // AP mode has no RSSI

    doc["firmware"] = FIRMWARE_VERSION;

    String output;
    serializeJson(doc, output);

    server.send(200, "application/json", output);
}


/* =========================================================
   POST /api/command
   ========================================================= */

void handleCommand() {

    sendCORSHeaders();

    if (!server.hasArg("plain")) {

        server.send(400, "application/json",
            "{\"error\":\"No body provided\"}");
        return;
    }

    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, server.arg("plain"));

    if (err) {

        server.send(400, "application/json",
            "{\"error\":\"Invalid JSON\"}");
        return;
    }

    const char* command = doc["command"];

    if (!command) {

        server.send(400, "application/json",
            "{\"error\":\"Missing command field\"}");
        return;
    }

    Serial.print("Command received: ");
    Serial.println(command);

    // Command handling — all stubs for now
    String response = "{\"status\":\"received\",\"command\":\"";
    response += command;
    response += "\",\"implemented\":false,\"message\":\"Command not yet implemented in firmware\"}";

    server.send(200, "application/json", response);
}


/* =========================================================
   ROOT PAGE
   ========================================================= */

void handleRoot() {

    sendCORSHeaders();

    String html = "<!DOCTYPE html><html><head>";
    html += "<meta charset='UTF-8'>";
    html += "<title>OneForge CubeSat</title>";
    html += "<style>";
    html += "body{background:#0a0a1a;color:#e0e0e0;font-family:monospace;padding:40px;text-align:center;}";
    html += "h1{color:#08a9ff;font-size:28px;}";
    html += "p{color:#8a9ca8;margin:8px 0;}";
    html += ".status{color:#00e887;font-weight:bold;font-size:18px;margin:20px 0;}";
    html += "a{color:#08a9ff;}";
    html += "</style></head><body>";
    html += "<h1>ONEFORGE CUBESAT</h1>";
    html += "<p>ESP32 Telemetry Server</p>";
    html += "<div class='status'>● ONLINE</div>";
    html += "<p>Device: " + String(DEVICE_ID) + "</p>";
    html += "<p>Firmware: " + String(FIRMWARE_VERSION) + "</p>";
    html += "<p>Uptime: " + String((millis() - startTime) / 1000) + " seconds</p>";
    html += "<p><br>API: <a href='/api/telemetry'>/api/telemetry</a></p>";
    html += "</body></html>";

    server.send(200, "text/html", html);
}


/* =========================================================
   UTILITY
   ========================================================= */

float round2(float val) {
    return (int)(val * 100 + 0.5) / 100.0;
}

float round1(float val) {
    return (int)(val * 10 + 0.5) / 10.0;
}
