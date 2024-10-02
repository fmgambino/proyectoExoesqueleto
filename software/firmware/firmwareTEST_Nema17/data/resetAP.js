document.addEventListener('DOMContentLoaded', () => {
    const apResetCheckbox = document.getElementById('ap-toggle');

    apResetCheckbox.addEventListener('change', function() {
        if (this.checked) {
            Swal.fire({
                title: "¿Estás seguro?",
                text: "¡Estás a punto de reiniciar el modo AP!",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Sí, reiniciar",
                cancelButtonText: "Cancelar"
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch('/reset_ap', { method: 'GET' })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                Swal.fire({
                                    title: "¡Éxito!",
                                    text: "Modo AP reiniciado exitosamente. El dispositivo se reiniciará.",
                                    icon: "success"
                                }).then(() => {
                                    apResetCheckbox.checked = false; // Volver a desactivar el switch
                                });
                            } else {
                                Swal.fire({
                                    title: "¡Error!",
                                    text: `Error al reiniciar el modo AP: ${data.error}`,
                                    icon: "error"
                                });
                                apResetCheckbox.checked = false; // Volver a desactivar el switch
                            }
                        })
                        .catch(error => {
                            Swal.fire({
                                title: "¡Error!",
                                text: 'Error al hacer la solicitud de reinicio de AP.',
                                icon: "error"
                            });
                            console.error('Error al hacer la solicitud de reinicio de AP:', error);
                            apResetCheckbox.checked = false; // Volver a desactivar el switch
                        });
                } else {
                    // Deselecciona el checkbox si el usuario cancela la acción
                    apResetCheckbox.checked = false;
                }
            });
        }
    });
});
