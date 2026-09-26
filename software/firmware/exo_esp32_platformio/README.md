# Exoesqueleto Pediatrico ESP32 - PlatformIO

Proyecto base con ESP32 DevKit v1, Arduino Framework, 2 MPU6050, 4 motores NEMA17 mediante drivers STEP/DIR y telemetria WebSocket para modelo 3D en tiempo real.

## Comandos

```bash
pio run
pio run -t upload
pio run -t uploadfs
pio device monitor
```

Al iniciar, el ESP32 crea el AP `EXO_PEDIATRICO_ESP32` con clave `12345678`. Abrir `http://192.168.4.1`.

## Advertencia

Este codigo NO garantiza estabilidad ni seguridad humana. Para uso real hacen falta sensores adicionales, arnes, parada de emergencia cableada, topes fisicos, pruebas con carga dummy y revision biomecanica.
