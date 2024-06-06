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

## Contribuciones

¡Las contribuciones son bienvenidas! Si deseas contribuir al proyecto, por favor abre un *issue* para discutir tus ideas o envía una *pull request*.

## Contacto

Para más información, ponte en contacto con nosotros en [info@electronicagambino.com](mailto:info@electronicagambino.com).
