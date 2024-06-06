# Proyecto Exoesqueleto Pediátrico con Monitoreo Biométrico

![Logo de Electronicagambino](https://electronicagambino.com/wp-content/uploads/elementor/thumbs/cropped-Electronica-Gambino-e1684335474114-q6losum0uq8caxhait9doqxx83gv53yq2d8g8oiv7o.png)

Este proyecto tiene como objetivo desarrollar un exoesqueleto pediátrico para niños con Atrofia Muscular Espinal (AME), incorporando monitoreo biométrico mediante IoT. El exoesqueleto permitirá a los niños con AME pararse y caminar con la ayuda de un andador, brindándoles una mayor autonomía y calidad de vida.

## Descripción del Firmware

El firmware se desarrollará utilizando PlatformIO con el framework Arduino mediante Visual Studio Code. Se utilizará el microcontrolador ESP32-WROOM-32U para controlar los motores paso a paso, gestionar la comunicación IoT y monitorear la actividad muscular mediante el sensor ECG EMG AD8832.

## Componentes Principales

- Microcontrolador ESP32-WROOM-32U
- Motores Paso a Paso Nema 17
- Sensores Mioeléctricos para detección de movimiento
- Sensor ECG EMG AD8832 para monitoreo de actividad muscular
- Conexión WiFi y Bluetooth Low Energy (BLE) para comunicación IoT

## Configuración del Entorno de Desarrollo

1. Instala PlatformIO en Visual Studio Code.
2. Clona este repositorio en tu computadora.
3. Abre el proyecto en Visual Studio Code.
4. Configura el archivo `platformio.ini` con la información del ESP32.
5. Compila y carga el firmware en el ESP32.

## Estructura del Proyecto

- **/src**: Contiene el código fuente del firmware.
- **/docs**: Documentación adicional del proyecto.
- **/hardware**: Esquemáticos y diseño de hardware.

## Uso del Firmware

El firmware controla los motores paso a paso en respuesta a las señales de los sensores mioeléctricos. Además, monitorea la actividad muscular utilizando el sensor ECG EMG AD8832. A continuación se describe cómo implementar y usar este sensor:

### Implementación del Sensor ECG EMG AD8832

1. Conecta el sensor ECG EMG AD8832 al pin analógico A0 del ESP32.
2. Proporciona la potencia adecuada al sensor según las especificaciones del fabricante.
3. Asegúrate de tener una buena conexión a tierra para reducir el ruido eléctrico.

### Forma de Uso del Sensor

El sensor ECG EMG AD8832 mide la actividad eléctrica de los músculos y proporciona una salida de voltaje proporcional a la actividad muscular. Puedes utilizar la siguiente función en tu código para medir esta actividad:

```cpp
#include <WiFi.h>
#include <BLEDevice.h>
#include <Stepper.h>

// Definición de pines para los motores paso a paso
#define MOTOR_1_STEP_PIN 2
#define MOTOR_1_DIR_PIN 3
#define MOTOR_2_STEP_PIN 4
#define MOTOR_2_DIR_PIN 5

// Definición de pines para el sensor muscular ECG EMG AD8832
#define EMG_SENSOR_PIN A0

// Definición de constantes para la configuración de los motores paso a paso
#define STEPS_PER_REVOLUTION 200
#define MOTOR_SPEED 200 // Velocidad en pasos por segundo

// Declaración de objetos Stepper para controlar los motores
Stepper stepperMotor1(STEPS_PER_REVOLUTION, MOTOR_1_STEP_PIN, MOTOR_1_DIR_PIN);
Stepper stepperMotor2(STEPS_PER_REVOLUTION, MOTOR_2_STEP_PIN, MOTOR_2_DIR_PIN);

// Variable para almacenar el estado del movimiento
bool isMoving = false;

// Función para inicializar la conexión WiFi
void setupWiFi() {
  // Coloca aquí tu código de inicialización de WiFi
}

// Función para inicializar la conexión BLE (Bluetooth Low Energy)
void setupBLE() {
  // Coloca aquí tu código de inicialización de BLE
}

// Función para inicializar el sensor muscular EMG
void setupEMGSensor() {
  pinMode(EMG_SENSOR_PIN, INPUT);
}

// Función para medir la actividad muscular con el sensor EMG
float measureMuscleActivity() {
  // Leer el valor del sensor EMG
  int emgValue = analogRead(EMG_SENSOR_PIN);

  // Convertir el valor a voltaje
  float voltage = emgValue * (3.3 / 4095.0); // 3.3V de referencia, 12 bits de resolución

  // Devolver el voltaje medido
  return voltage;
}

// Función para mover los motores paso a paso
void moveMotors() {
  // Coloca aquí tu código para controlar los motores según las señales de los sensores mioeléctricos
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

  // Inicialización del sensor muscular EMG
  setupEMGSensor();
}

// Función principal de bucle
void loop() {
  // Coloca aquí tu código principal de control de bucle
  moveMotors();

  // Medir la actividad muscular con el sensor EMG
  float muscleActivity = measureMuscleActivity();

  // Imprimir el valor medido en el puerto serie
  Serial.print("Actividad Muscular: ");
  Serial.print(muscleActivity);
  Serial.println(" V");
  
  // Agrega un retraso para evitar lecturas demasiado rápidas
  delay(1000);
}
```
