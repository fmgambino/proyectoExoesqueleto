# BIOTRON EXO Pediátrico V5

Correcciones incluidas:
- Visor 3D visible y más parecido al prototipo: trolley superior, perfiles negros, carcasas grises, NEMA17, cableado y pies pediátricos.
- Modo DEMO / REAL. DEMO muestra datos simulados aunque no haya ESP32 conectado.
- Secuencia inicial: sentado 90° → pararse → caminata adelante, atrás, derecha e izquierda.
- Popup con gráficas ECG y EMG usando Chart.js, con señal filtrada por separado.
- Firmware PlatformIO ESP32 DevKit v1 corregido sin `StaticJsonDocument`.
- OLED SH1106: logo/texto BIOTRON, pantalla de proyecto, autores y parámetros biomédicos.

## Uso
1. Abrir el proyecto en VS Code + PlatformIO.
2. Ejecutar `Build`.
3. Ejecutar `Upload Filesystem Image`.
4. Ejecutar `Upload`.
5. Conectarse al AP `BIOTRON_EXO`, password `12345678`, abrir `http://192.168.4.1/`.

## Seguridad
`ENABLE_MOTION` está en `false`. Cambiar a `true` solo en banco de pruebas, sin persona, con paro de emergencia físico, finales de carrera, arnés y supervisión.
