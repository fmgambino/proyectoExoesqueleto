document.addEventListener('DOMContentLoaded', () => {
    const modeToggle = document.getElementById('mode-toggle');
    const body = document.body;
    const logo = document.getElementById('logo');
    const lightLogo = 'https://www3.gobiernodecanarias.org/medusa/ecoescuela/elobservatorio/files/2011/10/BerkeleyBionicsLogo.png';
    const darkLogo = 'https://www3.gobiernodecanarias.org/medusa/ecoescuela/elobservatorio/files/2011/10/BerkeleyBionicsLogo.png';

    // Verificar el estado del tema desde localStorage
    if (localStorage.getItem('dark-theme') === 'enabled') {
        body.classList.add('dark-theme');
        modeToggle.checked = true;
        logo.src = darkLogo;
    } else {
        logo.src = lightLogo;
    }

    // Cambiar entre temas
    modeToggle.addEventListener('change', function() {
        if (this.checked) {
            body.classList.add('dark-theme');
            localStorage.setItem('dark-theme', 'enabled');
            logo.src = darkLogo;
        } else {
            body.classList.remove('dark-theme');
            localStorage.setItem('dark-theme', 'disabled');
            logo.src = lightLogo;
        }
    });

    // Control del motor
    document.getElementById('turnLeft').addEventListener('click', () => {
        fetch('/motor/left')  // Ruta corregida
            .then(response => response.json())
            .then(data => console.log('Motor gira a la izquierda:', data))
            .catch(err => console.error('Error:', err));
    });

    document.getElementById('turnRight').addEventListener('click', () => {
        fetch('/motor/right')  // Ruta corregida
            .then(response => response.json())
            .then(data => console.log('Motor gira a la derecha:', data))
            .catch(err => console.error('Error:', err));
    });
});
