document.addEventListener('DOMContentLoaded', function () {
    const btnLogin = document.getElementById('btnLogin');

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="modal-container">
            <button class="btn-close-modal">&times;</button>
            <h2 class="text-white">Iniciar Sesión</h2>
            <form>
                <div class="mb-3">
                    <label class="form-label text-white">Usuario</label>
                    <input type="text" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label class="form-label text-white">Contraseña</label>
                    <input type="password" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary w-100 mb-2">Entrar</button>
            </form>
            <button id="btnGoogleLogin" class="btn btn-danger w-100">Iniciar sesión con Google</button>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    const btnGoogleLogin = modalOverlay.querySelector('#btnGoogleLogin');

    btnLogin.addEventListener('click', function (e) {
        e.preventDefault();
        modalOverlay.style.display = 'flex';
        document.getElementById('contenidoPrincipal').classList.add('blur');
    });

    modalOverlay.querySelector('.btn-close-modal').addEventListener('click', function () {
        modalOverlay.style.display = 'none';
        document.getElementById('contenidoPrincipal').classList.remove('blur');
    });

    modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) {
            modalOverlay.style.display = 'none';
            document.getElementById('contenidoPrincipal').classList.remove('blur');
        }
    });

    btnGoogleLogin.addEventListener('click', function () {
        alert('Aquí conectaríamos a Google.');
    });
});
