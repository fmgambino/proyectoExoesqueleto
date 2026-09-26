# BIOTRON EXO Pediátrico V6

Proyecto PlatformIO para ESP32 DevKit v1 con visor 3D, telemetría biomédica, modo DEMO/REAL, OLED SH1106 y WebSocket.

## Correcciones V6
- Modelo 3D centrado y cámara corregida.
- Estado inicial sentado: rodillas a 90°.
- Logo BIOTRON en OLED como bitmap 128x64.
- Tarjetas biomédicas con iconos y unidades.
- Gráficas ECG y EMG en colores distintos, con ejes y unidades.
- Si se deshabilita ECG o EMG, la curva queda oculta.
- Demo simulada activa sin depender del ESP32.

## Uso
1. Abrir la carpeta en VS Code + PlatformIO.
2. Borrar `.pio` si existe.
3. Compilar: `PlatformIO: Build`.
4. Subir firmware: `PlatformIO: Upload`.
5. Subir web: `PlatformIO: Upload Filesystem Image`.
6. Conectarse al AP `BIOTRON_EXO`, contraseña `12345678`.

> Seguridad: `ENABLE_MOTION` está en `false`. Activarlo solo en banco de pruebas, sin persona.
