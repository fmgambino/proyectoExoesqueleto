# Exoesqueleto pediátrico ESP32 + visor 3D

Proyecto PlatformIO para ESP32 DevKit v1 con Framework Arduino.

## Funciones
- Web local servida desde LittleFS.
- Visor 3D Three.js refactorizado con rotación X/Y/Z, OrbitControls y rueda de mouse configurable.
- Telemetría WebSocket en tiempo real.
- 2 MPU6050, 4 motores NEMA17, ECG, EMG, SpO2 MAX30102/MAX30105, temperatura corporal DS18B20, LM35 ambiente y temperatura CPU ESP32.

## Uso
1. Ajustar pines en `src/main.cpp`.
2. `pio run -t upload`
3. `pio run -t uploadfs`
4. Conectarse al WiFi `EXO-PEDIATRICO` clave `exo123456`.
5. Abrir `http://192.168.4.1`.

## Seguridad
Este firmware es base de laboratorio. No usar con un paciente sin arnés, paro de emergencia cableado, límites mecánicos, sensores de presión por pie, validación clínica y supervisión profesional.
