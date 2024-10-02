/* -------------------------------------------------------------------
 * SmartPDU - JEFNet 2024/08
 * Sitio WEB: https://exoleto.online
 * Correo: admim@smartpdu.online
 * Cel_WSP: +54 3816150488
 * Plataforma: ESP32
 * Framework:  Arduino
 * Proyecto EXOLETO para el ESP32 con HTNL, JavaScript, CSS
 * EXOLETO Panel Admin v1.0
 * -------------------------------------------------------------------
*/

// -------------------------------------------------------------------
// Librerias
// -------------------------------------------------------------------

#include <Arduino.h>
#include <WebServer.h>
#include <SPIFFS.h>

// -------------------------------------------------------------------
// Archivos *.hpp - Fragmentar el Código
// -------------------------------------------------------------------
#include "server.hpp"
#include "controlNema17.hpp"

WiFiConnectionManager wifiManager;
WebServer server(80);

// Crear una instancia del motor Nema 17
Nema17Motor motor;

void setup() {
    Serial.begin(115200);

    // Configurar la conexión WiFi y mDNS
    wifiManager.setupWiFi();

    // Inicializar el motor Nema 17
    motor.init();

    // Inicializar SPIFFS
    if (!SPIFFS.begin(true)) {
        Serial.println("Error al montar SPIFFS");
        return;
    }

   // Configuración del servidor web
    server.on("/", HTTP_GET, []() {
        File file = SPIFFS.open("/index.html", "r");
        if (!file) {
            server.send(500, "text/plain", "Error al abrir el archivo");
            return;
        }
        server.streamFile(file, "text/html");
        file.close();
    });

    // Ruta para el archivo CSS
    server.on("/styles.css", HTTP_GET, []() {
        File file = SPIFFS.open("/styles.css", "r");
        if (!file) {
            server.send(500, "text/plain", "Error al abrir el archivo");
            return;
        }
        server.streamFile(file, "text/css");
        file.close();
    });

    // Ruta para el archivo JavaScript
    server.on("/script.js", HTTP_GET, []() {
        File file = SPIFFS.open("/script.js", "r");
        if (!file) {
            server.send(500, "text/plain", "Error al abrir el archivo");
            return;
        }
        server.streamFile(file, "application/javascript");
        file.close();
    });

    // Ruta para el archivo JavaScript
    server.on("/resetAP.js", HTTP_GET, []() {
        File file = SPIFFS.open("/resetAP.js", "r");
        if (!file) {
            server.send(500, "text/plain", "Error al abrir el archivo");
            return;
        }
        server.streamFile(file, "application/javascript");
        file.close();
    });

    // Ruta para controlar el motor Nema 17 (giro a la izquierda)
    server.on("/motor/left", HTTP_GET, []() {
      Serial.println("Girando motor a la izquierda");
      motor.enableMotor();           // Habilitar el motor
      motor.rotateLeft(200);         // Girar el motor a la izquierda 200 pasos
      motor.disableMotor();          // Deshabilitar el motor
      server.send(200, "application/json", "{\"status\":\"ok\", \"message\":\"Giro a la izquierda\"}");
    });

    // Ruta para controlar el motor Nema 17 (giro a la derecha)
    server.on("/motor/right", HTTP_GET, []() {
      Serial.println("Girando motor a la derecha");
      motor.enableMotor();           // Habilitar el motor
      motor.rotateRight(200);        // Girar el motor a la derecha 200 pasos
      motor.disableMotor();          // Deshabilitar el motor
      server.send(200, "application/json", "{\"status\":\"ok\", \"message\":\"Giro a la derecha\"}");
    });

    // Ruta para resetear el Modo AP
    server.on("/reset_ap", HTTP_GET, []() {
    Serial.println("Recibida solicitud de reinicio del AP.");
    
    // Llamar a la función para resetear la configuración WiFi
    wifiManager.resetWiFiSettings(); // Asegúrate de que `wifiManager` es accesible aquí

    Serial.println("Reiniciando el modo AP...");
    
    // Enviar respuesta antes de reiniciar
    server.send(200, "application/json", "{\"success\": true}");

    // Esperar un momento para que el cliente reciba la respuesta antes de reiniciar
    delay(1000);

    ESP.restart();  // Reinicia el ESP32 para habilitar nuevamente el modo AP
  });

    // Iniciar el servidor
    server.begin();
    Serial.println("Servidor iniciado");
}

void loop() {
    server.handleClient();  // Manejar solicitudes web
}
