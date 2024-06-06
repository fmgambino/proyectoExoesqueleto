#include <WiFi.h>
#include <BLEDevice.h>
#include <Stepper.h>

// Definición de pines para los motores paso a paso
#define MOTOR_1_STEP_PIN 2
#define MOTOR_1_DIR_PIN 3
#define MOTOR_2_STEP_PIN 4
#define MOTOR_2_DIR_PIN 5

// Definición de pines para los sensores musculares ECG EMG AD8832
#define EMG_SENSOR_PIN_LEFT 36
#define EMG_SENSOR_PIN_RIGHT 35

// Definición de constantes para la configuración de los motores paso a paso
#define STEPS_PER_REVOLUTION 200
#define MOTOR_SPEED 200 // Velocidad en pasos por segundo

// Declaración de objetos Stepper para controlar los motores
Stepper stepperMotorLeft(STEPS_PER_REVOLUTION, MOTOR_1_STEP_PIN, MOTOR_1_DIR_PIN);
Stepper stepperMotorRight(STEPS_PER_REVOLUTION, MOTOR_2_STEP_PIN, MOTOR_2_DIR_PIN);

// Umbrales para la detección de actividad muscular
#define THRESHOLD 1.0

// Función para inicializar la conexión WiFi
void setupWiFi() {
  // Configuración de la red WiFi
  const char* ssid = "TuSSID";
  const char* password = "TuPassword";

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Conectando a WiFi...");
  }

  Serial.println("Conectado a WiFi");
}

// Función para inicializar la conexión BLE (Bluetooth Low Energy)
void setupBLE() {
  // Inicialización básica de BLE
  BLEDevice::init("ExoesqueletoPediatrico");
  BLEServer *pServer = BLEDevice::createServer();
  // Configuración adicional puede ser necesaria según los requisitos del proyecto
}

// Función para inicializar los sensores musculares EMG
void setupEMGSensors() {
  pinMode(EMG_SENSOR_PIN_LEFT, INPUT);
  pinMode(EMG_SENSOR_PIN_RIGHT, INPUT);
}

// Función para medir la actividad muscular con el sensor EMG
float measureMuscleActivity(int sensorPin) {
  // Leer el valor del sensor EMG
  int emgValue = analogRead(sensorPin);

  // Convertir el valor a voltaje
  float voltage = emgValue * (3.3 / 4095.0); // 3.3V de referencia, 12 bits de resolución

  // Devolver el voltaje medido
  return voltage;
}

// Función para mover los motores paso a paso
void moveMotors(float leftMuscleActivity, float rightMuscleActivity) {
  if (leftMuscleActivity > THRESHOLD) {
    // Mover motor izquierdo hacia adelante
    stepperMotorLeft.setSpeed(MOTOR_SPEED);
    stepperMotorLeft.step(STEPS_PER_REVOLUTION / 2);
  }

  if (rightMuscleActivity > THRESHOLD) {
    // Mover motor derecho hacia adelante
    stepperMotorRight.setSpeed(MOTOR_SPEED);
    stepperMotorRight.step(STEPS_PER_REVOLUTION / 2);
  }
}

// Función de inicialización
void setup() {
  // Inicialización de los pines de dirección de los motores
  pinMode(MOTOR_1_DIR_PIN, OUTPUT);
  pinMode(MOTOR_2_DIR_PIN, OUTPUT);

  // Inicialización de la conexión WiFi
  setupWiFi();

  // Inicialización de la conexión BLE
  setupBLE();

  // Inicialización de los sensores musculares EMG
  setupEMGSensors();

  // Inicialización de la comunicación serie para depuración
  Serial.begin(115200);
}

// Función principal de bucle
void loop() {
  // Medir la actividad muscular con los sensores EMG
  float leftMuscleActivity = measureMuscleActivity(EMG_SENSOR_PIN_LEFT);
  float rightMuscleActivity = measureMuscleActivity(EMG_SENSOR_PIN_RIGHT);

  // Imprimir los valores medidos en el puerto serie
  Serial.print("Actividad Muscular Izquierda: ");
  Serial.print(leftMuscleActivity);
  Serial.print(" V, Actividad Muscular Derecha: ");
  Serial.print(rightMuscleActivity);
  Serial.println(" V");
  
  // Controlar los motores en función de la actividad muscular
  moveMotors(leftMuscleActivity, rightMuscleActivity);

  // Agregar un retraso para evitar lecturas demasiado rápidas
  delay(100);
}
