# EXO Pediátrico V4 - ESP32 DevKit V1 + visor 3D + ECG/EMG

Proyecto PlatformIO / Arduino para ESP32 DevKit V1.

## Cambios V4
- Estado inicial visual y lógico: **sentado a 90°**.
- Botón **Pararse + caminatas**: levanta desde sentado y ejecuta secuencia adelante, atrás, derecha e izquierda.
- Modelo 3D más parecido al prototipo: parte superior tipo carrito/trolley, placa negra, rieles laterales, rueditas, perfiles negros, carcazas grises, NEMA17 y pies pediátricos.
- Rotación X/Y/Z por sliders y rueda del mouse.
- Selector **DEMO / REAL**.
- Popup con gráficas ECG y EMG usando Chart.js CDN, con filtros independientes de visualización.
- Librerías PlatformIO corregidas: `esp32async/ESPAsyncWebServer` y `esp32async/AsyncTCP`.

## Uso
1. Abrir la carpeta en VS Code + PlatformIO.
2. Borrar `.pio` si viene de un proyecto anterior.
3. Compilar: `PlatformIO: Build`.
4. Subir firmware: `PlatformIO: Upload`.
5. Subir web: `PlatformIO: Upload Filesystem Image`.
6. Abrir la IP que muestra el monitor serial. Si no conecta WiFi, crea AP: `EXO-PEDIATRICO` clave `12345678`.

## Seguridad
`ENABLE_MOTION` está en `false` por defecto. Cambiar a `true` solo en banco de pruebas, sin persona, con E-STOP físico, arnés, topes mecánicos, sensores de presión en pies, encoders absolutos y supervisión.

Con 2 MPU6050 no se puede garantizar que no caiga. Para uso real se recomiendan: sensores FSR/celdas de carga por pie, encoders absolutos en articulaciones, finales de carrera, IMU adicional en torso, botón E-STOP cableado, medición de corriente de motores y arnés.
