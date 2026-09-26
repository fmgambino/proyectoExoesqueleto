# EXO Pediátrico ESP32 + Visor 3D V2

Proyecto PlatformIO para ESP32 DevKit V1 con visor 3D, modo DEMO con datos simulados y modo REAL por WebSocket.

## Uso
1. Abrir con PlatformIO.
2. Compilar y subir firmware: `pio run -t upload`.
3. Subir web al LittleFS: `pio run -t uploadfs`.
4. Conectarse al WiFi `EXO-PEDIATRICO`, clave `exo123456`.
5. Abrir `http://192.168.4.1/`.

## Modo visualizador
- DEMO: no requiere ESP32; genera telemetría y movimientos simulados.
- REAL: conecta al WebSocket del ESP32 y muestra sensores/motores reales.

## Controles 3D
- Arrastrar mouse: orbitar.
- Rueda: zoom o rotación según selector.
- Shift + rueda: rotación Y.
- Alt + rueda: rotación X.
- Sliders X/Y/Z: rotación absoluta del modelo.

## Seguridad
Este firmware es una base de banco y visualización. No habilita movimiento físico por defecto. Para pruebas con persona se requieren sensores redundantes, topes mecánicos, E-STOP cableado, arnés y validación clínica/ingenieril.
