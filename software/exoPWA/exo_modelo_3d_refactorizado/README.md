# Exoesqueleto Pediátrico 3D - Refactor

Abrir `index.html` con un servidor local, por ejemplo:

```bash
python -m http.server 8080
```

Luego entrar a `http://localhost:8080`.

Mejoras incluidas:
- OrbitControls sin bloqueo: giro completo, pan y zoom.
- Slider de rotación del modelo sobre eje Z.
- Diseño profesional tipo HUD.
- Animación GSAP estilo After Effects.
- WebSocket listo para ESP32: `ws://<host>:81/` con JSON `{lh,rh,lk,rk,rotZ}` en grados.
