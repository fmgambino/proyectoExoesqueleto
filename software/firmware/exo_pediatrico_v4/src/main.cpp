#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <AccelStepper.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <MAX30105.h>

// ===================== CONFIGURACION =====================
// Cambiar credenciales o usar el AP fallback "EXO-PEDIATRICO".
const char* WIFI_SSID = "EXO_WIFI";
const char* WIFI_PASS = "12345678";

#define ENABLE_MOTION false        // Seguridad: false por defecto. true solo en banco, sin persona.
#define SERIAL_BAUD 115200
#define WS_PERIOD_MS 50
#define CONTROL_PERIOD_MS 10
#define DEMO_DEFAULT true

// NEMA17 1.2°/paso => 300 pasos/vuelta. Ajustar microstepping al driver.
#define STEP_ANGLE_DEG 1.2f
#define MICROSTEPS 16
#define STEPS_PER_DEG (MICROSTEPS / STEP_ANGLE_DEG)
#define MAX_JOINT_DEG 95.0f
#define MIN_JOINT_DEG -15.0f
#define SAFE_TILT_DEG 12.0f

// Pines motores: STEP, DIR. Ajustar segun cableado real.
const int HIP_L_STEP = 26, HIP_L_DIR = 27;
const int KNEE_L_STEP = 14, KNEE_L_DIR = 12;
const int HIP_R_STEP = 33, HIP_R_DIR = 32;
const int KNEE_R_STEP = 25, KNEE_R_DIR = 13;
const int ENABLE_PIN = 4; // LOW habilita en muchos drivers. Ajustar.
const int ESTOP_PIN = 34; // Entrada solo input. Pull-up externo recomendado.

// Sensores analogicos / biomédicos.
const int ECG_PIN = 35;      // AD8232 u otro front-end ECG analogico.
const int EMG_PIN = 36;      // Sensor EMG analogico.
const int LM35_PIN = 39;     // LM35 ambiente: 10 mV/°C.
const int BODY_TEMP_ONEWIRE_PIN = 23; // DS18B20 temperatura corporal.

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
Adafruit_MPU6050 mpuLeft;
Adafruit_MPU6050 mpuRight;
MAX30105 max3010x;
OneWire oneWire(BODY_TEMP_ONEWIRE_PIN);
DallasTemperature bodyTemp(&oneWire);

AccelStepper hipL(AccelStepper::DRIVER, HIP_L_STEP, HIP_L_DIR);
AccelStepper kneeL(AccelStepper::DRIVER, KNEE_L_STEP, KNEE_L_DIR);
AccelStepper hipR(AccelStepper::DRIVER, HIP_R_STEP, HIP_R_DIR);
AccelStepper kneeR(AccelStepper::DRIVER, KNEE_R_STEP, KNEE_R_DIR);

struct JointTarget { float hipL, kneeL, hipR, kneeR; uint32_t hold; const char* name; };

// Inicio sentado: cadera y rodilla flexionadas ~90°. Luego stand y secuencia.
JointTarget gait[] = {
  { 90, 90, 90, 90, 1200, "SENTADO_90" },
  { 70, 70, 70, 70, 900,  "LEVANTAR_1" },
  { 42, 42, 42, 42, 900,  "LEVANTAR_2" },
  { 8,  5,  8,  5,  1200, "DE_PIE" },
  // 3 pasos adelante
  { 22, 10, -12, 8, 600, "ADELANTE_1" }, { -8, 4, 18, 12, 600, "ADELANTE_2" }, { 6, 2, 6, 2, 500, "ADELANTE_3" },
  { 22, 10, -12, 8, 600, "ADELANTE_4" }, { -8, 4, 18, 12, 600, "ADELANTE_5" }, { 6, 2, 6, 2, 500, "ADELANTE_6" },
  { 22, 10, -12, 8, 600, "ADELANTE_7" }, { -8, 4, 18, 12, 600, "ADELANTE_8" }, { 6, 2, 6, 2, 700, "ADELANTE_9" },
  // 3 pasos atras
  { -14, 8, 20, 10, 600, "ATRAS_1" }, { 18, 12, -10, 5, 600, "ATRAS_2" }, { 5, 2, 5, 2, 500, "ATRAS_3" },
  { -14, 8, 20, 10, 600, "ATRAS_4" }, { 18, 12, -10, 5, 600, "ATRAS_5" }, { 5, 2, 5, 2, 500, "ATRAS_6" },
  { -14, 8, 20, 10, 600, "ATRAS_7" }, { 18, 12, -10, 5, 600, "ATRAS_8" }, { 5, 2, 5, 2, 700, "ATRAS_9" },
  // derecha e izquierda: patrón visual/lateral, sin control de equilibrio real.
  { 16, 6, -4, 4, 600, "DERECHA_1" }, { 10, 4, 10, 4, 500, "DERECHA_2" }, { 16, 6, -4, 4, 600, "DERECHA_3" },
  { -4, 4, 16, 6, 600, "IZQUIERDA_1" }, { 10, 4, 10, 4, 500, "IZQUIERDA_2" }, { -4, 4, 16, 6, 600, "IZQUIERDA_3" },
  { 5, 2, 5, 2, 900, "FIN_DE_PIE" }
};
const int gaitCount = sizeof(gait) / sizeof(gait[0]);

bool demoMode = DEMO_DEFAULT;
bool running = false;
bool motorsEnabled = false;
int gaitIndex = 0;
uint32_t gaitT0 = 0, lastWs = 0, lastControl = 0;
String modeName = "IDLE";
float ecg = 0, emg = 0, bpm = 0, spo2 = 0, bodyC = 0, ambientC = 0, cpuC = 0;
float rollL = 0, pitchL = 0, rollR = 0, pitchR = 0;

float clampf(float v, float lo, float hi) { return max(lo, min(hi, v)); }
long degToSteps(float deg) { return lround(clampf(deg, MIN_JOINT_DEG, MAX_JOINT_DEG) * STEPS_PER_DEG); }
void setMotorEnable(bool en) { motorsEnabled = en; pinMode(ENABLE_PIN, OUTPUT); digitalWrite(ENABLE_PIN, en ? LOW : HIGH); }

void setTargets(const JointTarget& t) {
  hipL.moveTo(degToSteps(t.hipL)); kneeL.moveTo(degToSteps(t.kneeL));
  hipR.moveTo(degToSteps(t.hipR)); kneeR.moveTo(degToSteps(t.kneeR));
  modeName = t.name;
}

float readLm35C() { return (analogReadMilliVolts(LM35_PIN) / 10.0f); }
float readAnalogNorm(int pin) { return analogRead(pin) / 4095.0f; }

void readMpu() {
  sensors_event_t a, g, temp;
  if (mpuLeft.getEvent(&a, &g, &temp)) {
    rollL = atan2(a.acceleration.y, a.acceleration.z) * 57.2958f;
    pitchL = atan2(-a.acceleration.x, sqrt(a.acceleration.y*a.acceleration.y + a.acceleration.z*a.acceleration.z)) * 57.2958f;
  }
  if (mpuRight.getEvent(&a, &g, &temp)) {
    rollR = atan2(a.acceleration.y, a.acceleration.z) * 57.2958f;
    pitchR = atan2(-a.acceleration.x, sqrt(a.acceleration.y*a.acceleration.y + a.acceleration.z*a.acceleration.z)) * 57.2958f;
  }
}

void readBiomedical() {
  if (demoMode) {
    float t = millis() / 1000.0f;
    bpm = 78 + 5 * sin(t * 0.8f);
    spo2 = 97 + 1.2f * sin(t * 0.23f);
    bodyC = 36.6f + 0.15f * sin(t * 0.18f);
    ambientC = 24.0f + 0.8f * sin(t * 0.08f);
    cpuC = 44.0f + 2.5f * sin(t * 0.13f);
    ecg = 0.50f + 0.04f * sin(t*18.0f) + ((fmod(t, 0.82f) < 0.035f) ? 0.48f : 0.0f);
    emg = 0.18f + 0.08f * sin(t*31.0f) + ((fmod(t, 1.4f) < 0.25f) ? 0.35f * abs(sin(t*85.0f)) : 0.0f);
    return;
  }
  ecg = readAnalogNorm(ECG_PIN);
  emg = readAnalogNorm(EMG_PIN);
  ambientC = readLm35C();
  bodyTemp.requestTemperatures();
  bodyC = bodyTemp.getTempCByIndex(0);
  cpuC = temperatureRead();
  long ir = max3010x.getIR();
  long red = max3010x.getRed();
  // Estimación simple para visualización. Para uso médico integrar algoritmo validado y calibración.
  spo2 = (ir > 50000 && red > 1000) ? clampf(104.0f - (float)red / (float)ir * 17.0f, 80, 100) : 0;
  bpm = (ir > 50000) ? 75 : 0;
}

bool unsafeTilt() {
  return (!demoMode && (abs(rollL) > SAFE_TILT_DEG || abs(rollR) > SAFE_TILT_DEG || abs(pitchL) > SAFE_TILT_DEG || abs(pitchR) > SAFE_TILT_DEG));
}

void stopAll(const char* reason) {
  running = false;
  setMotorEnable(false);
  modeName = reason;
}

void startSequence() {
  gaitIndex = 0;
  running = true;
  gaitT0 = millis();
  setMotorEnable(ENABLE_MOTION);
  setTargets(gait[gaitIndex]);
}

void controlLoop() {
  if (!running) return;
  if (digitalRead(ESTOP_PIN) == LOW) { stopAll("ESTOP"); return; }
  if (unsafeTilt()) { stopAll("TILT_SAFE_STOP"); return; }
  if (ENABLE_MOTION) { hipL.run(); kneeL.run(); hipR.run(); kneeR.run(); }
  if (millis() - gaitT0 >= gait[gaitIndex].hold) {
    gaitIndex++;
    if (gaitIndex >= gaitCount) { stopAll("SECUENCIA_COMPLETA"); return; }
    gaitT0 = millis();
    setTargets(gait[gaitIndex]);
  }
}

String telemetryJson() {
  StaticJsonDocument<1536> doc;
  doc["demo"] = demoMode;
  doc["running"] = running;
  doc["motors"] = motorsEnabled;
  doc["state"] = modeName;
  doc["idx"] = gaitIndex;
  JsonObject bio = doc["bio"].to<JsonObject>();
  bio["bpm"] = bpm; bio["spo2"] = spo2; bio["bodyC"] = bodyC; bio["ambientC"] = ambientC; bio["cpuC"] = cpuC; bio["ecg"] = ecg; bio["emg"] = emg;
  JsonObject imu = doc["imu"].to<JsonObject>();
  imu["rollL"] = rollL; imu["pitchL"] = pitchL; imu["rollR"] = rollR; imu["pitchR"] = pitchR;
  JsonObject joints = doc["joints"].to<JsonObject>();
  if (gaitIndex < gaitCount) { joints["hipL"] = gait[gaitIndex].hipL; joints["kneeL"] = gait[gaitIndex].kneeL; joints["hipR"] = gait[gaitIndex].hipR; joints["kneeR"] = gait[gaitIndex].kneeR; }
  String out; serializeJson(doc, out); return out;
}

void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  if (type != WS_EVT_DATA) return;
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (!(info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT)) return;
  String msg;
  for (size_t i = 0; i < len; i++) msg += (char)data[i];
  if (msg == "start") startSequence();
  else if (msg == "stop") stopAll("STOP_USUARIO");
  else if (msg == "demo:on") demoMode = true;
  else if (msg == "demo:off") demoMode = false;
  else if (msg == "seat") { gaitIndex = 0; setTargets(gait[0]); modeName = "SENTADO_90"; }
}

void setup() {
  Serial.begin(SERIAL_BAUD);
  pinMode(ESTOP_PIN, INPUT); setMotorEnable(false);
  analogReadResolution(12);
  Wire.begin();
  LittleFS.begin(true);
  bodyTemp.begin();
  mpuLeft.begin(0x68); mpuRight.begin(0x69);
  max3010x.begin(Wire, I2C_SPEED_FAST);

  for (auto* m : {&hipL, &kneeL, &hipR, &kneeR}) { m->setMaxSpeed(900); m->setAcceleration(650); }

  WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID, WIFI_PASS);
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 7000) delay(250);
  if (WiFi.status() != WL_CONNECTED) { WiFi.mode(WIFI_AP); WiFi.softAP("EXO-PEDIATRICO", "12345678"); }
  Serial.print("IP: "); Serial.println(WiFi.getMode() == WIFI_AP ? WiFi.softAPIP() : WiFi.localIP());

  ws.onEvent(onWsEvent); server.addHandler(&ws);
  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  server.onNotFound([](AsyncWebServerRequest *r){ r->send(404, "text/plain", "Not found"); });
  server.begin();
  modeName = "SENTADO_90";
}

void loop() {
  uint32_t now = millis();
  if (now - lastControl >= CONTROL_PERIOD_MS) { lastControl = now; readMpu(); readBiomedical(); controlLoop(); }
  if (now - lastWs >= WS_PERIOD_MS) { lastWs = now; ws.textAll(telemetryJson()); ws.cleanupClients(); }
}
