const API_URL = window.location.protocol + '//' + window.location.hostname + ':5000';

// Función para verificar la sesión
async function checkSession() {
    try {
        console.log('navbar.js - Verificando sesión...');
        const response = await fetch(`${API_URL}/api/session`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log('navbar.js - Respuesta de sesión:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('navbar.js - Datos de sesión:', data);
            if (data.authenticated && data.user) {
                console.log('navbar.js - Usuario autenticado detectado.');
                // Obtener los EdeCoins actualizados del usuario
                const userDataResponse = await fetch(`${API_URL}/api/user/${data.user.id}`, {
                    credentials: 'include'
                });
                if (userDataResponse.ok) {
                    const userData = await userDataResponse.json();
                    data.user.edecoins = userData.edecoins;
                    console.log('navbar.js - EdeCoins obtenidos para el usuario:', userData.edecoins);
                }
                
                console.log('navbar.js - Llamando a updateUIForLoggedInUser...');
                updateUIForLoggedInUser(data.user);
                console.log('navbar.js - updateUIForLoggedInUser llamada.');
                return data.user;
            }
        } else {
            console.log('navbar.js - No hay sesión activa o respuesta no OK.');
        }
        return null;
    } catch (error) {
        console.error('navbar.js - Error verificando sesión:', error);
        return null;
    }
}

// Función para actualizar la UI cuando el usuario está logueado
function updateUIForLoggedInUser(user) {
    console.log('navbar.js - Dentro de updateUIForLoggedInUser.');
    const btnLogin = document.getElementById('btnLogin');
    console.log('navbar.js - btnLogin element:', btnLogin);
    if (btnLogin) {
        console.log('navbar.js - btnLogin encontrado. Procediendo a actualizar UI.');
        
        // Asegurarnos de que la URL de la imagen sea absoluta y correcta
        let avatarUrl;
        if (user.avatar_url) {
            if (user.avatar_url.startsWith('http')) {
                avatarUrl = user.avatar_url;
            } else if (user.avatar_url.startsWith('/avatars')) {
                avatarUrl = `${API_URL}${user.avatar_url}`;
            } else {
                avatarUrl = `/${user.avatar_url.replace(/^\//, '')}`;
            }
        } else {
            avatarUrl = './Imagenes/perfil.jpg';
        }
        
        console.log('navbar.js - URL del avatar construida:', avatarUrl);
        console.log('navbar.js - EdeCoins del usuario:', user.edecoins);

        // Detectar si estamos en una subcarpeta (como Secciones)
        const isInSubfolder = window.location.pathname.includes('/Secciones/');
        const edecoinImgPath = isInSubfolder ? '../Imagenes/EdeCoin.png' : './Imagenes/EdeCoin.png';

        // Limpiar y actualizar el botón de login
        btnLogin.className = '';
        btnLogin.style.textDecoration = 'none';
        btnLogin.style.padding = '5px 15px';
        btnLogin.style.color = '#ffffff';
        btnLogin.removeAttribute('href');

        // Crear el contenedor del perfil
        const profileContainer = document.createElement('div');
        profileContainer.className = 'profile-container';
        
        // Contenido del botón de perfil con manejo de error mejorado y EdeCoins
        const profileContent = `
            <div class="d-flex align-items-center">
                <div class="edecoins-container me-3">
                    <img src="${edecoinImgPath}" alt="EdeCoins" class="edecoin-icon" style="image-rendering: -webkit-optimize-contrast;">
                    <span class="edecoins-amount">${user.edecoins !== undefined ? user.edecoins.toLocaleString() : '0'}</span>
                </div>
                <a href="/perfil.html?id=${user.id}" style="text-decoration: none;">
                    <img src="${avatarUrl}" 
                         alt="Perfil" 
                         class="rounded-circle me-3" 
                         style="width: 65px; height: 65px; object-fit: cover; border: 2px solid #3c3c3c; image-rendering: -webkit-optimize-contrast; cursor: pointer;"
                         onerror="if (this.src !== './Imagenes/perfil.jpg') this.src = './Imagenes/perfil.jpg';">
                </a>
                <span style="font-size: 1.2rem; color: #ffffff; font-weight: 500;">${user.username}</span>
            </div>
        `;

        // Crear el menú desplegable solo con el botón de cerrar sesión
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'profile-dropdown';
        dropdownMenu.innerHTML = `
            <button class="logout-button" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i>
                Cerrar Sesión
            </button>
        `;

        // Agregar el contenido al contenedor del perfil
        profileContainer.innerHTML = profileContent;
        profileContainer.appendChild(dropdownMenu);

        // Reemplazar el contenido del botón con el contenedor del perfil
        console.log('navbar.js - Reemplazando contenido de btnLogin con perfil.');
        btnLogin.innerHTML = '';
        btnLogin.appendChild(profileContainer);
        console.log('navbar.js - Contenido de btnLogin reemplazado.');

        // Ocultar botón de registro si existe
        // Modificado para soportar rutas relativas (./Registro.html) y absolutas (/Registro.html)
        console.log('navbar.js - Buscando botón de registro...');
        const btnRegistro = document.querySelector('a[href="/Registro.html"], a[href="../Registro.html"]');
        console.log('navbar.js - btnRegistro element:', btnRegistro);
        if (btnRegistro) {
            console.log('navbar.js - btnRegistro encontrado. Ocultando...');
            btnRegistro.style.display = 'none';
            console.log('navbar.js - btnRegistro oculto.');
        } else {
             console.log('navbar.js - btnRegistro no encontrado.');
        }
    } else {
         console.log('navbar.js - btnLogin no encontrado. No se puede actualizar la UI.');
    }
}

// Función para cerrar sesión
async function logout() {
    try {
        console.log('Intentando cerrar sesión...');
        const response = await fetch(`${API_URL}/api/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            console.log('Sesión cerrada correctamente');
            window.location.href = '/index.html';
        } else {
            console.error('Error al cerrar sesión:', await response.text());
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

// Verificar sesión cuando se carga la página
console.log('navbar.js - Script cargado');
document.addEventListener('DOMContentLoaded', function() {
    console.log('navbar.js - DOMContentLoaded activado.');
    console.log('navbar.js - Inicializando navbar y verificando sesión...');
    checkSession();
    console.log('navbar.js - checkSession llamada.');
}); 