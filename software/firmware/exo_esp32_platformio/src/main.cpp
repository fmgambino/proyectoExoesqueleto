/*
  Exoesqueleto pediatrico - ESP32 DevKit v1 + Arduino + PlatformIO
  ------------------------------------------------------------------
  Hardware esperado:
  - ESP32 DevKit v1
  - 4 drivers para NEMA17 tipo A4988/DRV8825/TMC en STEP/DIR/EN
  - 2 MPU6050: uno para pierna izquierda y otro para pierna derecha
  - Fuente externa para motores. GND comun ESP32 + drivers + sensores.

  IMPORTANTE DE SEGURIDAD:
  Este firmware es una base de desarrollo/simulacion. NO debe usarse sobre un
  niño/persona sin supervision clinica, arnes, boton de emergencia, topes
  mecanicos, finales de carrera y validacion biomecanica. Con 2 MPU6050 NO se
  puede garantizar que no caiga: faltan sensores de contacto/carga en pies,
  limites articulares redundantes y preferentemente encoders absolutos.
*/

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <AccelStepper.h>
#include "I2Cdev.h"
#include "MPU6050.h"

// ===================== CONFIGURACION WIFI =====================
// Por defecto crea un AP. Tambien puede conectarse a tu router cambiando WIFI_STA_MODE a 1.
#define WIFI_STA_MODE 0
const char* STA_SSID = "TU_WIFI";
const char* STA_PASS = "TU_CLAVE";
const char* AP_SSID  = "EXO_PEDIATRICO_ESP32";
const char* AP_PASS  = "12345678";

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// ===================== PINES ESP32 DEVKIT V1 =====================
// Evitar pines de strapping para senales criticas si tu placa tiene comportamiento raro.
struct MotorPins { uint8_t step, dir, en; };
MotorPins M_HIP_L   { 26, 27, 25 };
MotorPins M_KNEE_L  { 14, 12, 25 };
MotorPins M_HIP_R   { 33, 32, 25 };
MotorPins M_KNEE_R  { 19, 18, 25 };

const uint8_t I2C_SDA = 21;
const uint8_t I2C_SCL = 22;
const uint8_t MPU_ADDR_L = 0x68; // AD0 a GND
const uint8_t MPU_ADDR_R = 0x69; // AD0 a VCC

const uint8_t PIN_ESTOP = 34;    // entrada, usar pull-up externo recomendado
const uint8_t PIN_START = 35;    // entrada, usar pull-up externo recomendado

// Sensores recomendados opcionales: finales de carrera / contacto pie
const int PIN_FOOT_L = -1;       // poner pin si se instala sensor de contacto/carga
const int PIN_FOOT_R = -1;

// ===================== MOTORES =====================
AccelStepper hipL(AccelStepper::DRIVER, M_HIP_L.step, M_HIP_L.dir);
AccelStepper kneeL(AccelStepper::DRIVER, M_KNEE_L.step, M_KNEE_L.dir);
AccelStepper hipR(AccelStepper::DRIVER, M_HIP_R.step, M_HIP_R.dir);
AccelStepper kneeR(AccelStepper::DRIVER, M_KNEE_R.step, M_KNEE_R.dir);

// NEMA17 1.2° => 300 pasos/rev en paso completo.
// Ajustar MICROSTEPS segun jumpers del driver.
const float MOTOR_STEPS_PER_REV = 300.0f;
const float MICROSTEPS = 16.0f;
const float GEAR_RATIO = 1.0f; // ajustar si hay reduccion
const float STEPS_PER_DEG = (MOTOR_STEPS_PER_REV * MICROSTEPS * GEAR_RATIO) / 360.0f;

// Limites conservadores iniciales. Ajustar mecanicamente.
const float HIP_MIN = -35, HIP_MAX = 55;
const float KNEE_MIN = 0,   KNEE_MAX = 95;
const float MAX_SPEED_DPS = 32.0f;
const float MAX_ACCEL_DPS = 80.0f;

// Signos por montaje; invertir si gira al reves.
const int SIGN_HIP_L  =  1;
const int SIGN_KNEE_L =  1;
const int SIGN_HIP_R  = -1;
const int SIGN_KNEE_R = -1;

struct JointAngles {
  float hipL = 0, kneeL = 90, hipR = 0, kneeR = 90;
};
JointAngles q, qTarget;

long degToSteps(float deg, int sign) { return lroundf(deg * STEPS_PER_DEG * sign); }
float clampf(float v, float lo, float hi) { return max(lo, min(hi, v)); }

void configureStepper(AccelStepper& s) {
  s.setMaxSpeed(MAX_SPEED_DPS * STEPS_PER_DEG);
  s.setAcceleration(MAX_ACCEL_DPS * STEPS_PER_DEG);
}

void moveJointTargets(const JointAngles& t) {
  qTarget.hipL  = clampf(t.hipL,  HIP_MIN,  HIP_MAX);
  qTarget.hipR  = clampf(t.hipR,  HIP_MIN,  HIP_MAX);
  qTarget.kneeL = clampf(t.kneeL, KNEE_MIN, KNEE_MAX);
  qTarget.kneeR = clampf(t.kneeR, KNEE_MIN, KNEE_MAX);

  hipL.moveTo(degToSteps(qTarget.hipL, SIGN_HIP_L));
  kneeL.moveTo(degToSteps(qTarget.kneeL, SIGN_KNEE_L));
  hipR.moveTo(degToSteps(qTarget.hipR, SIGN_HIP_R));
  kneeR.moveTo(degToSteps(qTarget.kneeR, SIGN_KNEE_R));
}

void runMotors() {
  hipL.run(); kneeL.run(); hipR.run(); kneeR.run();
  q.hipL  = hipL.currentPosition()  / (STEPS_PER_DEG * SIGN_HIP_L);
  q.kneeL = kneeL.currentPosition() / (STEPS_PER_DEG * SIGN_KNEE_L);
  q.hipR  = hipR.currentPosition()  / (STEPS_PER_DEG * SIGN_HIP_R);
  q.kneeR = kneeR.currentPosition() / (STEPS_PER_DEG * SIGN_KNEE_R);
}

bool motorsAtTarget() {
  return hipL.distanceToGo()==0 && kneeL.distanceToGo()==0 && hipR.distanceToGo()==0 && kneeR.distanceToGo()==0;
}

// ===================== MPU6050 =====================
MPU6050 mpuL(MPU_ADDR_L), mpuR(MPU_ADDR_R);
struct ImuState { float pitch=0, roll=0; int16_t ax=0, ay=0, az=0, gx=0, gy=0, gz=0; };
ImuState imuL, imuR;
unsigned long lastImuUs = 0;

void updateOneImu(MPU6050& mpu, ImuState& s, float dt) {
  mpu.getMotion6(&s.ax, &s.ay, &s.az, &s.gx, &s.gy, &s.gz);
  const float accPitch = atan2f((float)s.ay, sqrtf((float)s.ax*s.ax + (float)s.az*s.az)) * 180.0f / PI;
  const float accRoll  = atan2f(-(float)s.ax, (float)s.az) * 180.0f / PI;
  const float gyroPitchRate = s.gx / 131.0f; // aprox para +/-250 dps
  const float gyroRollRate  = s.gy / 131.0f;
  const float alpha = 0.96f;
  s.pitch = alpha * (s.pitch + gyroPitchRate * dt) + (1.0f-alpha) * accPitch;
  s.roll  = alpha * (s.roll  + gyroRollRate  * dt) + (1.0f-alpha) * accRoll;
}

void updateImu() {
  unsigned long now = micros();
  float dt = (lastImuUs == 0) ? 0.01f : (now - lastImuUs) / 1000000.0f;
  lastImuUs = now;
  dt = clampf(dt, 0.001f, 0.05f);
  updateOneImu(mpuL, imuL, dt);
  updateOneImu(mpuR, imuR, dt);
}

bool unsafeTilt() {
  // En prototipo, detener si el tronco/piernas se alejan demasiado.
  // Ajustar despues de calibrar montaje de IMU.
  return fabsf(imuL.roll) > 28 || fabsf(imuR.roll) > 28 || fabsf(imuL.pitch) > 55 || fabsf(imuR.pitch) > 55;
}

// ===================== GESTOS =====================
enum Mode { IDLE, STAND_UP, WALK_FWD, WALK_BACK, STEP_RIGHT, STEP_LEFT, DONE, FAULT };
Mode mode = IDLE;
int rep = 0;
int phase = 0;
unsigned long phaseStart = 0;
String faultReason = "";

void enableMotors(bool en) { digitalWrite(M_HIP_L.en, en ? LOW : HIGH); }

void emergencyStop(const String& reason) {
  mode = FAULT; faultReason = reason;
  hipL.stop(); kneeL.stop(); hipR.stop(); kneeR.stop();
  enableMotors(false);
}

void setPhase(int p) { phase = p; phaseStart = millis(); }
bool phaseTime(uint32_t ms) { return millis() - phaseStart >= ms; }

// Posturas simplificadas: solo cadera/rodilla en plano sagital. Sin tobillo activo.
const JointAngles POSE_SIT     { 0, 90, 0, 90 };
const JointAngles POSE_HALF    { 8, 45, 8, 45 };
const JointAngles POSE_STAND   { 0, 6,  0, 6  };
const JointAngles POSE_L_SWING { 22, 18, -10, 8  };
const JointAngles POSE_R_SWING { -10, 8,  22, 18 };
const JointAngles POSE_L_BACK  { -18, 10, 12, 10 };
const JointAngles POSE_R_BACK  { 12, 10, -18, 10 };

void startSequence() {
  enableMotors(true);
  faultReason = "";
  rep = 0; setPhase(0); mode = STAND_UP;
  moveJointTargets(POSE_SIT);
}

void nextMode(Mode m) { mode = m; rep = 0; setPhase(0); }

void gaitStateMachine() {
  if (mode == IDLE || mode == FAULT || mode == DONE) return;

  // Proteccion minima. Para pruebas en banco se puede comentar, no para persona.
  if (unsafeTilt()) { emergencyStop("inclinacion insegura por MPU6050"); return; }

  switch(mode) {
    case STAND_UP:
      if (phase == 0) { moveJointTargets(POSE_SIT); setPhase(1); }
      else if (phase == 1 && phaseTime(800) && motorsAtTarget()) { moveJointTargets(POSE_HALF); setPhase(2); }
      else if (phase == 2 && phaseTime(1200) && motorsAtTarget()) { moveJointTargets(POSE_STAND); setPhase(3); }
      else if (phase == 3 && motorsAtTarget()) nextMode(WALK_FWD);
      break;

    case WALK_FWD:
      if (phase == 0) { moveJointTargets((rep % 2 == 0) ? POSE_L_SWING : POSE_R_SWING); setPhase(1); }
      else if (phase == 1 && phaseTime(700) && motorsAtTarget()) { moveJointTargets(POSE_STAND); setPhase(2); }
      else if (phase == 2 && phaseTime(450) && motorsAtTarget()) { rep++; if(rep >= 3) nextMode(WALK_BACK); else setPhase(0); }
      break;

    case WALK_BACK:
      if (phase == 0) { moveJointTargets((rep % 2 == 0) ? POSE_L_BACK : POSE_R_BACK); setPhase(1); }
      else if (phase == 1 && phaseTime(700) && motorsAtTarget()) { moveJointTargets(POSE_STAND); setPhase(2); }
      else if (phase == 2 && phaseTime(450) && motorsAtTarget()) { rep++; if(rep >= 3) nextMode(STEP_RIGHT); else setPhase(0); }
      break;

    case STEP_RIGHT:
      // Con solo cadera/rodilla y sin abduccion/adduccion real, esto es una simulacion visual.
      if (phase == 0) { JointAngles p = POSE_STAND; p.hipL = -6; p.hipR = 10; moveJointTargets(p); setPhase(1); }
      else if (phase == 1 && phaseTime(650) && motorsAtTarget()) { moveJointTargets(POSE_STAND); setPhase(2); }
      else if (phase == 2 && phaseTime(450) && motorsAtTarget()) { rep++; if(rep >= 3) nextMode(STEP_LEFT); else setPhase(0); }
      break;

    case STEP_LEFT:
      if (phase == 0) { JointAngles p = POSE_STAND; p.hipL = 10; p.hipR = -6; moveJointTargets(p); setPhase(1); }
      else if (phase == 1 && phaseTime(650) && motorsAtTarget()) { moveJointTargets(POSE_STAND); setPhase(2); }
      else if (phase == 2 && phaseTime(450) && motorsAtTarget()) { rep++; if(rep >= 3) { mode = DONE; moveJointTargets(POSE_STAND); } else setPhase(0); }
      break;

    default: break;
  }
}

String modeName() {
  switch(mode){
    case IDLE: return "IDLE"; case STAND_UP: return "STAND_UP"; case WALK_FWD: return "WALK_FWD";
    case WALK_BACK: return "WALK_BACK"; case STEP_RIGHT: return "STEP_RIGHT"; case STEP_LEFT: return "STEP_LEFT";
    case DONE: return "DONE"; case FAULT: return "FAULT";
  }
  return "UNKNOWN";
}

void broadcastTelemetry() {
  static uint32_t last = 0;
  if (millis() - last < 40) return; // 25 Hz
  last = millis();
  String json = "{";
  json += "\"mode\":\"" + modeName() + "\",";
  json += "\"phase\":" + String(phase) + ",\"rep\":" + String(rep) + ",";
  json += "\"angles\":{";
  json += "\"hipL\":" + String(q.hipL,1) + ",\"kneeL\":" + String(q.kneeL,1) + ",";
  json += "\"hipR\":" + String(q.hipR,1) + ",\"kneeR\":" + String(q.kneeR,1) + "},";
  json += "\"target\":{";
  json += "\"hipL\":" + String(qTarget.hipL,1) + ",\"kneeL\":" + String(qTarget.kneeL,1) + ",";
  json += "\"hipR\":" + String(qTarget.hipR,1) + ",\"kneeR\":" + String(qTarget.kneeR,1) + "},";
  json += "\"imu\":{";
  json += "\"leftPitch\":" + String(imuL.pitch,1) + ",\"leftRoll\":" + String(imuL.roll,1) + ",";
  json += "\"rightPitch\":" + String(imuR.pitch,1) + ",\"rightRoll\":" + String(imuR.roll,1) + "},";
  json += "\"fault\":\"" + faultReason + "\"";
  json += "}";
  ws.textAll(json);
}

void handleCommand(const String& msg) {
  if (msg == "START") startSequence();
  else if (msg == "STOP") emergencyStop("parada por usuario");
  else if (msg == "RESET") { enableMotors(true); mode = IDLE; faultReason=""; moveJointTargets(POSE_SIT); }
  else if (msg == "STAND") { enableMotors(true); mode=IDLE; moveJointTargets(POSE_STAND); }
  else if (msg == "SIT") { enableMotors(true); mode=IDLE; moveJointTargets(POSE_SIT); }
}

void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
               void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_DATA) {
    String msg;
    for(size_t i=0; i<len; i++) msg += (char)data[i];
    handleCommand(msg);
  }
}

void setupWeb() {
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);
  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  server.begin();
}

void setup() {
  Serial.begin(115200);
  pinMode(M_HIP_L.en, OUTPUT); enableMotors(false);
  pinMode(PIN_ESTOP, INPUT);
  pinMode(PIN_START, INPUT);

  configureStepper(hipL); configureStepper(kneeL); configureStepper(hipR); configureStepper(kneeR);
  hipL.setCurrentPosition(degToSteps(POSE_SIT.hipL, SIGN_HIP_L));
  kneeL.setCurrentPosition(degToSteps(POSE_SIT.kneeL, SIGN_KNEE_L));
  hipR.setCurrentPosition(degToSteps(POSE_SIT.hipR, SIGN_HIP_R));
  kneeR.setCurrentPosition(degToSteps(POSE_SIT.kneeR, SIGN_KNEE_R));
  moveJointTargets(POSE_SIT);

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000);
  mpuL.initialize(); mpuR.initialize();
  Serial.printf("MPU L: %s | MPU R: %s\n", mpuL.testConnection()?"OK":"FAIL", mpuR.testConnection()?"OK":"FAIL");

  LittleFS.begin(true);

#if WIFI_STA_MODE
  WiFi.mode(WIFI_STA);
  WiFi.begin(STA_SSID, STA_PASS);
  uint32_t t0 = millis();
  while(WiFi.status()!=WL_CONNECTED && millis()-t0<10000) { delay(250); Serial.print("."); }
  Serial.println(WiFi.localIP());
#else
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("AP IP: "); Serial.println(WiFi.softAPIP());
#endif
  setupWeb();
}

void loop() {
  updateImu();

  if (digitalRead(PIN_ESTOP) == LOW) emergencyStop("E-STOP activado");
  if (digitalRead(PIN_START) == LOW && mode == IDLE) startSequence();

  gaitStateMachine();
  runMotors();
  broadcastTelemetry();
  ws.cleanupClients();
}
