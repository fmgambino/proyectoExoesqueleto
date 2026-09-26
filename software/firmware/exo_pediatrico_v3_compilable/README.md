# EXO Pediátrico V3 - ESP32 DevKit V1

Corrección principal: `platformio.ini` actualizado para usar las librerías actuales de ESPAsyncWebServer:

```ini
esp32async/ESPAsyncWebServer
esp32async/AsyncTCP
```

El error anterior se debía a que `me-no-dev/ESP Async WebServer` / `me-no-dev/AsyncTCP` quedó obsoleto/movido en el registro de PlatformIO.

## Pasos recomendados después de reemplazar el proyecto

1. Cerrar VS Code.
2. Borrar la carpeta `.pio` del proyecto anterior.
3. Abrir esta carpeta nueva en VS Code.
4. Ejecutar `PlatformIO: Clean`.
5. Ejecutar `PlatformIO: Build`.
6. Para subir web a LittleFS: `PlatformIO: Upload Filesystem Image`.
7. Para subir firmware: `PlatformIO: Upload`.

## Modo web

La interfaz en `data/` conserva:
- selector DEMO / REAL,
- visor 3D,
- rotación X/Y/Z,
- scroll del mouse,
- telemetría biomédica y estado ESP32.

## Seguridad

`ENABLE_PHYSICAL_MOTION` está en `false` por defecto. No habilitar movimiento físico sin arnés, E-STOP físico, topes mecánicos, limit switches, sensores de presión en pies y validación en banco.
