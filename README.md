# Proyecto Exoesqueleto Pediátrico con Monitoreo Biométrico

![Logo de Electronicagambino](https://electronicagambino.com/wp-content/uploads/elementor/thumbs/cropped-Electronica-Gambino-e1684335474114-q6losum0uq8caxhait9doqxx83gv53yq2d8g8oiv7o.png)

Este proyecto tiene como objetivo desarrollar un exoesqueleto pediátrico para niños con Atrofia Muscular Espinal (AME), incorporando monitoreo biométrico mediante IoT. El exoesqueleto permitirá a los niños con AME pararse y caminar con la ayuda de un andador, brindándoles una mayor autonomía y calidad de vida.

## Descripción del Firmware

El firmware se desarrollará utilizando PlatformIO con el framework Arduino mediante Visual Studio Code. Se utilizará el microcontrolador ESP32-WROOM-32U para controlar los motores paso a paso y gestionar la comunicación IoT.

## Componentes Principales

- Microcontrolador ESP32-WROOM-32U
- Motores Paso a Paso Nema 17
- Sensores Mioeléctricos para detección de movimiento
- Sensores Biométricos para monitoreo de salud
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

El firmware controla los motores paso a paso en respuesta a las señales de los sensores mioeléctricos. Además, establece la conexión WiFi y BLE para el monitoreo biométrico y la comunicación IoT.

## Código de Prueba

A continuación se muestra un ejemplo básico del código para controlar los motores paso a paso en el ESP32:

```cpp
#include <WiFi.h>
#include <BLEDevice.h>
#include <Stepper.h>

// Definición de pines para los motores paso a paso
#define MOTOR_1_STEP_PIN 2
#define MOTOR_1_DIR_PIN 3
#define MOTOR_2_STEP_PIN 4
#define MOTOR_2_DIR_PIN 5

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
}

// Función principal de bucle
void loop() {
  // Coloca aquí tu código principal de control de bucle
  moveMotors();
}
```
