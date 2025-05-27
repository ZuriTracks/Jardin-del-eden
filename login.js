// Función global para cerrar sesión
window.logout = async function() {
    try {
        const API_URL = window.location.protocol + '//' + window.location.hostname + ':5000';
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
};

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded - Iniciando script de login');
    
    const btnLogin = document.getElementById('btnLogin');
    const userProfileContainer = document.getElementById('userProfileContainer');
    const API_URL = window.location.protocol + '//' + window.location.hostname + ':5000';

    console.log('API URL:', API_URL);
    console.log('Current location:', window.location.href);

    // Check session status immediately when page loads
    checkSession();

    // Función para verificar la conexión al servidor
    async function checkServerConnection() {
        try {
            console.log('Verificando conexión al servidor...');
            const response = await fetch(`${API_URL}/api/test`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            console.log('Estado del servidor:', data);
            return true;
        } catch (error) {
            console.error('Error detallado conectando al servidor:', error);
            return false;
        }
    }

    // Función para verificar la sesión
    async function checkSession() {
        try {
            console.log('Verificando sesión...');
            const response = await fetch(`${API_URL}/api/session`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            console.log('Respuesta de sesión:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Datos de sesión:', data);
                if (data.authenticated && data.user) {
                    updateUIForLoggedInUser(data.user);
                    return data.user;
                }
            } else {
                console.log('Error en respuesta de sesión:', await response.text());
            }
            return null;
        } catch (error) {
            console.error('Error detallado verificando sesión:', error);
            return null;
        }
    }

    // Verificar conexión al cargar la página
    checkServerConnection().then(isConnected => {
        if (!isConnected) {
            console.error('No se pudo establecer conexión con el servidor');
            const loginError = document.getElementById('loginError');
            if (loginError) {
                loginError.textContent = 'No se pudo conectar al servidor. Por favor, intenta más tarde.';
                loginError.style.display = 'block';
            }
        }
    });

    // Función para actualizar la UI cuando el usuario está logueado
    function updateUIForLoggedInUser(user) {
        if (btnLogin) {
            console.log('Actualizando UI para usuario:', user);
            
            // Asegurarnos de que la URL de la imagen sea absoluta y correcta
            let avatarUrl;
            if (user.avatar_url) {
                // Si la URL ya es absoluta, usarla directamente
                if (user.avatar_url.startsWith('http')) {
                    avatarUrl = user.avatar_url;
                } 
                // Si la URL comienza con /avatars, agregarla al API_URL
                else if (user.avatar_url.startsWith('/avatars')) {
                    avatarUrl = `${API_URL}${user.avatar_url}`;
                }
                // En cualquier otro caso, asumimos que es una ruta relativa desde la raíz
                else {
                    avatarUrl = `/${user.avatar_url.replace(/^\//, '')}`;
                }
            } else {
                avatarUrl = './Imagenes/perfil.jpg';
            }
            
            console.log('URL del avatar construida:', avatarUrl);

            // Crear el contenedor del perfil
            const profileContainer = document.createElement('div');
            profileContainer.className = 'profile-container';
            
            // Contenido del botón de perfil con manejo de error mejorado
            const profileContent = `
                <div class="d-flex align-items-center">
                    <img src="${avatarUrl}" 
                         alt="Perfil" 
                         class="rounded-circle me-3" 
                         style="width: 40px; height: 40px; object-fit: cover; border: 2px solid #3c3c3c;"
                         onerror="if (this.src !== './Imagenes/perfil.jpg') this.src = './Imagenes/perfil.jpg';">
                    <span style="font-size: 1.1rem; color: #ffffff; font-weight: 500;">${user.username}</span>
                </div>
            `;

            // Crear el menú desplegable solo con el botón de cerrar sesión
            const dropdownMenu = document.createElement('div');
            dropdownMenu.className = 'profile-dropdown';
            dropdownMenu.innerHTML = `
                <button class="logout-button" onclick="window.logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    Cerrar Sesión
                </button>
            `;

            // Limpiar y actualizar el botón de login
            btnLogin.className = '';
            btnLogin.style.textDecoration = 'none';
            btnLogin.style.padding = '5px 15px';
            btnLogin.href = `/perfil.html?id=${user.id}`;

            // Agregar el contenido al contenedor del perfil
            profileContainer.innerHTML = profileContent;
            profileContainer.appendChild(dropdownMenu);

            // Reemplazar el contenido del botón con el contenedor del perfil
            btnLogin.innerHTML = '';
            btnLogin.appendChild(profileContainer);

            // Ocultar botón de registro si existe
            const btnRegistro = document.querySelector('a[href="./Registro.html"]');
            if (btnRegistro) {
                btnRegistro.style.display = 'none';
            }
        }
    }

    // Función para actualizar los contadores de seguidores y seguidos
    async function updateFollowCounts(userId) {
        try {
            const response = await fetch(`${API_URL}/api/user/${userId}`);
            const userData = await response.json();
            
            // Actualizar los contadores en el menú desplegable
            const followerCount = document.getElementById('followerCount');
            const followingCount = document.getElementById('followingCount');
            
            if (followerCount) {
                followerCount.textContent = userData.followers_count || 0;
            }
            if (followingCount) {
                followingCount.textContent = userData.following_count || 0;
            }
        } catch (error) {
            console.error('Error al obtener los contadores de seguidores:', error);
        }
    }

    // Crear el modal de inicio de sesión
    const modalHTML = `
        <div class="modal-overlay" style="display: none;">
            <div class="modal-container">
                <button type="button" class="btn-close-modal">&times;</button>
                <h2 class="text-white">Iniciar Sesión</h2>
                <form id="loginForm" class="login-form">
                    <div class="mb-3">
                        <label class="form-label text-white">Usuario</label>
                        <input type="text" class="form-control" id="loginUsername" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-white">Contraseña</label>
                        <input type="password" class="form-control" id="loginPassword" required>
                        <div class="form-check mt-2">
                            <input type="checkbox" class="form-check-input" id="rememberMe">
                            <label class="form-check-label text-white" for="rememberMe">Mantener sesión iniciada</label>
                        </div>
                    </div>
                    <div class="alert alert-danger" id="loginError" style="display: none;"></div>
                    <button type="submit" id="submitLogin" class="btn btn-primary w-100 mb-2">Entrar</button>
                </form>
                <button type="button" id="btnGoogleLogin" class="btn btn-danger w-100">Iniciar sesión con Google</button>
            </div>
        </div>
    `;

    // Eliminar modal existente si hay uno
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    // Agregar el modal al body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('Modal de login agregado al DOM');

    // Obtener referencias a los elementos después de agregarlos al DOM
    const modalOverlay = document.querySelector('.modal-overlay');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const btnCloseModal = modalOverlay.querySelector('.btn-close-modal');
    const btnGoogleLogin = document.getElementById('btnGoogleLogin');
    const submitButton = document.getElementById('submitLogin');

    console.log('Referencias obtenidas:', {
        modalOverlay: !!modalOverlay,
        loginForm: !!loginForm,
        submitButton: !!submitButton
    });

    // Función para mostrar el modal
    function showLoginModal() {
        console.log('Mostrando modal de login');
        modalOverlay.style.display = 'flex';
        document.getElementById('loginUsername').focus();
    }

    // Función para ocultar el modal
    function hideLoginModal() {
        console.log('Ocultando modal de login');
        modalOverlay.style.display = 'none';
        loginForm.reset();
        loginError.style.display = 'none';
    }

    // Event listener para el botón de login
    if (btnLogin) {
        btnLogin.addEventListener('click', function(e) {
            console.log('Click en botón de login');
            if (!btnLogin.querySelector('.profile-container')) {
                e.preventDefault();
                showLoginModal();
            }
        });
    }

    // Event listener para cerrar el modal
    btnCloseModal.addEventListener('click', hideLoginModal);

    // Cerrar modal al hacer clic fuera
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            hideLoginModal();
        }
    });

    // Event listener para el formulario de login
    if (loginForm) {
        console.log('Agregando event listener al formulario de login');
        
        loginForm.onsubmit = async function(e) {
            e.preventDefault();
            console.log('Formulario enviado - Evento submit capturado');

            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;

            console.log('Datos del formulario:', { username, rememberMe });

            // Deshabilitar el botón de submit
            submitButton.disabled = true;
            submitButton.textContent = 'Iniciando sesión...';

            try {
                console.log('Enviando petición de login...');
                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        username,
                        password,
                        rememberMe
                    })
                });

                console.log('Respuesta recibida:', response.status);

                if (response.ok) {
                    const data = await response.json();
                    console.log('Login exitoso:', data);
                    hideLoginModal();
                    updateUIForLoggedInUser(data.user);
                    setTimeout(() => window.location.reload(), 500);
                } else {
                    const errorText = await response.text();
                    console.error('Error en login:', errorText);
                    loginError.textContent = 'Usuario o contraseña incorrectos';
                    loginError.style.display = 'block';
                }
            } catch (error) {
                console.error('Error en la petición:', error);
                loginError.textContent = 'Error de conexión al servidor';
                loginError.style.display = 'block';
            } finally {
                // Rehabilitar el botón
                submitButton.disabled = false;
                submitButton.textContent = 'Entrar';
            }
        };

        // Agregar también el listener al botón submit directamente
        submitButton.addEventListener('click', function(e) {
            console.log('Click en botón submit');
        });
    }

    // Event listener para el botón de Google
    btnGoogleLogin.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Click en botón de Google');
        alert('Inicio de sesión con Google no disponible por el momento');
    });

    console.log('Script de login inicializado completamente');
});