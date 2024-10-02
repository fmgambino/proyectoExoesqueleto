#ifndef SERVER_HPP
#define SERVER_HPP

#include <WiFiManager.h>
#include <ESPmDNS.h>

class WiFiConnectionManager {
public:
    WiFiConnectionManager() = default;

    // Inicializa la conexión WiFi usando WiFiManager
    void setupWiFi(const char* apName = "ESP32-Motor-Control", const char* mdnsName = "exoleto") {
    // Inicializar WiFiManager
    WiFiManager wifiManager;

    // Iniciar el portal cautivo si no hay red WiFi configurada
    if (!wifiManager.autoConnect(apName)) {
        Serial.println("Error al conectar a la red WiFi. Reiniciando...");
        ESP.restart();  // Reinicia el ESP32 si no se puede conectar
    }

    // Si la conexión es exitosa, imprime la IP local
    Serial.println("Conectado a la red WiFi.");
    Serial.print("IP local asignada: ");
    Serial.println(WiFi.localIP());

    // Configurar mDNS
    if (!MDNS.begin(mdnsName)) {
        Serial.println("Error al configurar mDNS.");
        // Espera un momento para permitir la depuración
        delay(2000);
        Serial.println("Intentando reiniciar el mDNS...");
        if (MDNS.begin(mdnsName)) {
            Serial.printf("mDNS configurado. Accede a http://%s.local o http://%s.online\n", mdnsName, mdnsName);
        } else {
            Serial.println("Error al configurar mDNS tras reinicio.");
        }
    } else {
        Serial.printf("mDNS configurado. Accede a http://%s.local o http://%s.online\n", mdnsName, mdnsName);
    }
}

    // Función para resetear la configuración WiFi (puede llamarse desde un botón, por ejemplo)
    void resetWiFiSettings() {
        WiFiManager wifiManager;
        wifiManager.resetSettings(); // Borra las configuraciones WiFi guardadas
        Serial.println("Configuraciones WiFi reseteadas.");
    }
};

#endif // SERVER_HPP
