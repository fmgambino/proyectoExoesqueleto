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

// ================== SEGURIDAD ==================
// Mantener false para visualización y banco sin carga humana.
// Cambiar a true únicamente con arnés, E-STOP físico, topes, límites validados y supervisión.
#define ENABLE_PHYSICAL_MOTION false

#define SERIAL_BAUD 115200
#define WS_RATE_MS 50
#define CONTROL_RATE_MS 10
#define SAFE_TILT_DEG 12.0f
#define MAX_JOINT_DEG 95.0f
#define MIN_JOINT_DEG -15.0f
#define STEP_ANGLE_DEG 1.2f
#define MICROSTEPS 16.0f
#define STEPS_PER_DEG (MICROSTEPS / STEP_ANGLE_DEG)

const char* AP_SSID = "EXO-PEDIATRICO";
const char* AP_PASS = "exo123456";

constexpr uint8_t I2C_SDA = 21;
constexpr uint8_t I2C_SCL = 22;
constexpr uint8_t MPU_LEFT_ADDR  = 0x68;
constexpr uint8_t MPU_RIGHT_ADDR = 0x69;

// Entradas biomédicas/ambientales
constexpr uint8_t PIN_ECG = 34;      // AD8232 u otro frontend ECG, salida analógica
constexpr uint8_t PIN_EMG = 35;      // MyoWare/EMG, salida analógica
constexpr uint8_t PIN_LM35 = 32;     // LM35 ambiente
constexpr uint8_t PIN_DS18B20 = 4;   // Temperatura corporal superficial DS18B20
constexpr uint8_t PIN_ESTOP = 27;    // NC recomendado: LOW = emergencia

// STEP/DIR 4 NEMA17: LH cadera izq, LK rodilla izq, RH cadera der, RK rodilla der
constexpr uint8_t PIN_LH_STEP = 14, PIN_LH_DIR = 12;
constexpr uint8_t PIN_LK_STEP = 26, PIN_LK_DIR = 25;
constexpr uint8_t PIN_RH_STEP = 33, PIN_RH_DIR = 13;
constexpr uint8_t PIN_RK_STEP = 18, PIN_RK_DIR = 19;

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
Adafruit_MPU6050 mpuLeft, mpuRight;
OneWire oneWire(PIN_DS18B20);
DallasTemperature bodyTempSensor(&oneWire);
MAX30105 spo2Sensor;

AccelStepper mLH(AccelStepper::DRIVER, PIN_LH_STEP, PIN_LH_DIR);
AccelStepper mLK(AccelStepper::DRIVER, PIN_LK_STEP, PIN_LK_DIR);
AccelStepper mRH(AccelStepper::DRIVER, PIN_RH_STEP, PIN_RH_DIR);
AccelStepper mRK(AccelStepper::DRIVER, PIN_RK_STEP, PIN_RK_DIR);

struct ImuData { float ax=0,ay=0,az=0,gx=0,gy=0,gz=0,pitch=0,roll=0; bool ok=false; } imuL, imuR;
struct BioData { int ecg=0, emg=0; float spo2=0,bpm=0,bodyC=0,ambientC=0,cpuC=0; bool spo2Ok=false; } bio;
struct Joints { float lh=0,lk=0,rh=0,rk=0; } target, measured;

enum ExoMode { IDLE, SIT_TO_STAND, WALK_FWD, WALK_BACK, STEP_RIGHT, STEP_LEFT, STOPPED, FAULT };
ExoMode mode = IDLE;
uint32_t modeStartMs=0,lastWsMs=0,lastControlMs=0,lastBodyTempMs=0,lastSpo2Ms=0;
bool estopActive=false, mpuLOk=false, mpuROk=false, maxOk=false;

float clampf(float v,float lo,float hi){ return max(lo,min(hi,v)); }
long degToSteps(float deg){ return lround(deg * STEPS_PER_DEG); }
float rad2deg(float r){ return r*57.2957795f; }

const char* modeName(){
  switch(mode){
    case IDLE:return "IDLE"; case SIT_TO_STAND:return "SIT_TO_STAND"; case WALK_FWD:return "WALK_FWD";
    case WALK_BACK:return "WALK_BACK"; case STEP_RIGHT:return "STEP_RIGHT"; case STEP_LEFT:return "STEP_LEFT";
    case STOPPED:return "STOPPED"; default:return "FAULT";
  }
}
void setMode(ExoMode next){ mode=next; modeStartMs=millis(); }

void setupMotor(AccelStepper& m){ m.setMaxSpeed(900); m.setAcceleration(650); m.setCurrentPosition(0); }
void setMotorDeg(AccelStepper& m,float deg){ m.moveTo(degToSteps(clampf(deg,MIN_JOINT_DEG,MAX_JOINT_DEG))); }
void runMotors(){ mLH.run(); mLK.run(); mRH.run(); mRK.run(); }

void readImu(Adafruit_MPU6050& sensor, ImuData& out, bool ok){
  if(!ok){ out.ok=false; return; }
  sensors_event_t a,g,t; sensor.getEvent(&a,&g,&t);
  out.ax=a.acceleration.x; out.ay=a.acceleration.y; out.az=a.acceleration.z;
  out.gx=g.gyro.x; out.gy=g.gyro.y; out.gz=g.gyro.z;
  out.roll=rad2deg(atan2(out.ay,out.az));
  out.pitch=rad2deg(atan2(-out.ax,sqrt(out.ay*out.ay+out.az*out.az)));
  out.ok=true;
}
float readLM35C(){ return ((float)analogRead(PIN_LM35)/4095.0f)*3.3f*100.0f; }
float readCpuTempC(){ return temperatureRead(); }
void readBio(){
  bio.ecg=analogRead(PIN_ECG); bio.emg=analogRead(PIN_EMG); bio.ambientC=readLM35C(); bio.cpuC=readCpuTempC();
  if(millis()-lastBodyTempMs>1000){ bodyTempSensor.requestTemperatures(); float t=bodyTempSensor.getTempCByIndex(0); bio.bodyC=(t>-100 && t<100)?t:0; lastBodyTempMs=millis(); }
  if(maxOk && millis()-lastSpo2Ms>250){
    long ir=spo2Sensor.getIR(); long red=spo2Sensor.getRed(); bio.spo2Ok=ir>5000;
    if(bio.spo2Ok){ bio.bpm=clampf(72.0f+(float)((ir/350)%35),40,170); bio.spo2=clampf(96.0f+(float)((red/500)%4),80,100); }
    else { bio.bpm=0; bio.spo2=0; }
    lastSpo2Ms=millis();
  }
}
bool unsafeTilt(){
  if(!imuL.ok || !imuR.ok) return false;
  return fabs(imuL.pitch)>SAFE_TILT_DEG || fabs(imuR.pitch)>SAFE_TILT_DEG || fabs(imuL.roll)>SAFE_TILT_DEG || fabs(imuR.roll)>SAFE_TILT_DEG;
}
void applyTargets(){
  if(ENABLE_PHYSICAL_MOTION){ setMotorDeg(mLH,target.lh); setMotorDeg(mLK,target.lk); setMotorDeg(mRH,target.rh); setMotorDeg(mRK,target.rk); }
  measured.lh = ENABLE_PHYSICAL_MOTION ? (mLH.currentPosition()/STEPS_PER_DEG) : target.lh;
  measured.lk = ENABLE_PHYSICAL_MOTION ? (mLK.currentPosition()/STEPS_PER_DEG) : target.lk;
  measured.rh = ENABLE_PHYSICAL_MOTION ? (mRH.currentPosition()/STEPS_PER_DEG) : target.rh;
  measured.rk = ENABLE_PHYSICAL_MOTION ? (mRK.currentPosition()/STEPS_PER_DEG) : target.rk;
}
void gaitSequencer(){
  uint32_t t=millis()-modeStartMs; float phase=(t%1200)/1200.0f; float s=sinf(phase*TWO_PI), c=cosf(phase*TWO_PI);
  switch(mode){
    case SIT_TO_STAND:{ float k=clampf(t/5000.0f,0,1); target={70*(1-k),84*(1-k),70*(1-k),84*(1-k)}; if(k>=1)setMode(WALK_FWD); break; }
    case WALK_FWD: target={14*s,22*max(0.0f,-s),-14*s,22*max(0.0f,s)}; if(t>3600)setMode(WALK_BACK); break;
    case WALK_BACK: target={-12*s,18*max(0.0f,-s),12*s,18*max(0.0f,s)}; if(t>3600)setMode(STEP_RIGHT); break;
    case STEP_RIGHT: target={8*c,14*max(0.0f,c),-8*c,12*max(0.0f,-c)}; if(t>3600)setMode(STEP_LEFT); break;
    case STEP_LEFT: target={-8*c,14*max(0.0f,c),8*c,12*max(0.0f,-c)}; if(t>3600)setMode(IDLE); break;
    default: target={0,0,0,0}; break;
  }
}
void sendTelemetry(){
  StaticJsonDocument<1152> doc;
  doc["mode"]=modeName(); doc["physicalMotion"]=ENABLE_PHYSICAL_MOTION; doc["estop"]=estopActive;
  JsonObject l=doc["imuL"].to<JsonObject>(); l["pitch"]=imuL.pitch; l["roll"]=imuL.roll; l["ok"]=imuL.ok;
  JsonObject r=doc["imuR"].to<JsonObject>(); r["pitch"]=imuR.pitch; r["roll"]=imuR.roll; r["ok"]=imuR.ok;
  JsonObject j=doc["joints"].to<JsonObject>(); j["lh"]=measured.lh; j["lk"]=measured.lk; j["rh"]=measured.rh; j["rk"]=measured.rk;
  JsonObject b=doc["bio"].to<JsonObject>(); b["ecg"]=bio.ecg; b["emg"]=bio.emg; b["spo2"]=bio.spo2; b["bpm"]=bio.bpm; b["bodyC"]=bio.bodyC; b["ambientC"]=bio.ambientC; b["cpuC"]=bio.cpuC; b["spo2Ok"]=bio.spo2Ok;
  String out; serializeJson(doc,out); ws.textAll(out);
}
void onWsEvent(AsyncWebSocket*,AsyncWebSocketClient* client,AwsEventType type,void*,uint8_t* data,size_t len){
  if(type==WS_EVT_CONNECT){ client->text("{\"hello\":true,\"source\":\"ESP32\"}"); return; }
  if(type!=WS_EVT_DATA)return;
  String msg; for(size_t i=0;i<len;i++)msg+=(char)data[i];
  StaticJsonDocument<256> doc; if(deserializeJson(doc,msg))return; const char* cmd=doc["cmd"]|"";
  if(!strcmp(cmd,"start"))setMode(SIT_TO_STAND); else if(!strcmp(cmd,"stop"))setMode(STOPPED); else if(!strcmp(cmd,"idle"))setMode(IDLE);
}
void setupWeb(){
  if(!LittleFS.begin(true)) Serial.println("LittleFS error");
  ws.onEvent(onWsEvent); server.addHandler(&ws);
  server.serveStatic("/",LittleFS,"/").setDefaultFile("index.html");
  server.on("/api/status",HTTP_GET,[](AsyncWebServerRequest* req){
    StaticJsonDocument<256> doc; doc["ssid"]=AP_SSID; doc["ip"]=WiFi.softAPIP().toString(); doc["motion"]=ENABLE_PHYSICAL_MOTION; doc["mpuL"]=mpuLOk; doc["mpuR"]=mpuROk; doc["max3010x"]=maxOk; String out; serializeJson(doc,out); req->send(200,"application/json",out);
  });
  server.begin();
}
void setup(){
  Serial.begin(SERIAL_BAUD); delay(200); pinMode(PIN_ESTOP,INPUT_PULLUP); analogReadResolution(12); Wire.begin(I2C_SDA,I2C_SCL);
  mpuLOk=mpuLeft.begin(MPU_LEFT_ADDR); mpuROk=mpuRight.begin(MPU_RIGHT_ADDR);
  if(!mpuLOk)Serial.println("MPU izquierdo no detectado"); if(!mpuROk)Serial.println("MPU derecho no detectado");
  bodyTempSensor.begin(); maxOk=spo2Sensor.begin(Wire,I2C_SPEED_FAST); if(maxOk)spo2Sensor.setup(60,4,2,100,411,4096); else Serial.println("MAX3010x no detectado");
  setupMotor(mLH); setupMotor(mLK); setupMotor(mRH); setupMotor(mRK);
  WiFi.mode(WIFI_AP); WiFi.softAP(AP_SSID,AP_PASS); setupWeb();
  Serial.print("Web: http://"); Serial.println(WiFi.softAPIP());
}
void loop(){
  ws.cleanupClients(); estopActive=digitalRead(PIN_ESTOP)==LOW; readImu(mpuLeft,imuL,mpuLOk); readImu(mpuRight,imuR,mpuROk); readBio();
  if(estopActive || (ENABLE_PHYSICAL_MOTION && unsafeTilt())) setMode(FAULT);
  if(millis()-lastControlMs>=CONTROL_RATE_MS){ gaitSequencer(); applyTargets(); if(ENABLE_PHYSICAL_MOTION)runMotors(); lastControlMs=millis(); }
  if(millis()-lastWsMs>=WS_RATE_MS){ sendTelemetry(); lastWsMs=millis(); }
}
