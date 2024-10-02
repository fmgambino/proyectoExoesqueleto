#ifndef CONTROLNEMA17_HPP
#define CONTROLNEMA17_HPP

#include <Arduino.h>

// Definir los pines utilizados para controlar el driver A4988
#define DIR_PIN  2    // Pin para controlar la dirección del motor
#define STEP_PIN 3    // Pin para los pasos del motor
#define ENABLE_PIN 4  // Pin para habilitar el motor (opcional)

// Definir la velocidad del motor (mayor número es más lento)
#define STEP_DELAY 1000  // Microsegundos entre pasos

// Clase para controlar el motor Nema 17
class Nema17Motor {
  public:
    // Inicializa los pines
    void init() {
        pinMode(DIR_PIN, OUTPUT);
        pinMode(STEP_PIN, OUTPUT);
        pinMode(ENABLE_PIN, OUTPUT);
        disableMotor(); // Inicialmente el motor está desactivado
    }

    // Habilita el motor
    void enableMotor() {
        digitalWrite(ENABLE_PIN, LOW); // LOW habilita el motor
    }

    // Deshabilita el motor
    void disableMotor() {
        digitalWrite(ENABLE_PIN, HIGH); // HIGH deshabilita el motor
    }

    // Gira el motor en la dirección especificada
    void rotate(bool direction, int steps) {
        digitalWrite(DIR_PIN, direction);  // Establecer la dirección: true = derecha, false = izquierda

        for (int i = 0; i < steps; i++) {
            digitalWrite(STEP_PIN, HIGH);  // Generar pulso de paso
            delayMicroseconds(STEP_DELAY);
            digitalWrite(STEP_PIN, LOW);
            delayMicroseconds(STEP_DELAY);
        }
    }

    // Gira a la izquierda
    void rotateLeft(int steps) {
        rotate(false, steps); // false para girar a la izquierda
    }

    // Gira a la derecha
    void rotateRight(int steps) {
        rotate(true, steps);  // true para girar a la derecha
    }
};

#endif
