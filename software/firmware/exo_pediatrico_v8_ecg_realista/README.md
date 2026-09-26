# BIOTRON EXO Pediátrico V7

Proyecto PlatformIO para ESP32 DevKit V1 + visor web 3D.

Correcciones V7:
- Error C++ de asignación `Joints` corregido con `assignJoints()`.
- Modelo 3D centrado y estado inicial sentado con rodillas a 90°.
- Señales DEMO ECG tipo AD8232 y EMG tipo burst muscular.
- Gráficas ECG/EMG con escalas y unidades: ECG 0-1200 mV, EMG 0-1000 mV, tiempo en segundos.
- Al deshabilitar ECG o EMG se oculta el bloque completo.
- Iconos SVG profesionales en variables biomédicas.
- OLED SH1106: logo, proyecto, autores y parámetros biomédicos.

## Uso
1. Abrir carpeta en VS Code + PlatformIO.
2. Borrar `.pio` si viene de versiones anteriores.
3. Compilar y subir firmware.
4. Subir filesystem: PlatformIO > Upload Filesystem Image.
5. Conectarse al AP `BIOTRON_EXO` / `12345678` y abrir la IP del ESP32.

IMPORTANTE: `ENABLE_MOTION` está en `false` por seguridad. Activarlo solo en banco, sin persona y con E-STOP.


## V8 - ECG simulado mejorado
- Señal ECG DEMO reescrita para parecerse al AD8232 mostrado en SignalScope: baseline cercano a 500, QRS angosto alto, P y T visibles, deriva basal y ruido fino.
- Escala gráfica ECG: eje X en segundos, eje Y 0-1000 mV relativos.
- El filtro ECG conserva el pico R para que la morfología no quede suavizada en exceso.
