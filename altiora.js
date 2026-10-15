let altioraData = null;
let modoRegistro = false;

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch('altiora.json');
        altioraData = await response.json();
        
        setTimeout(() => {
            const loadingScreen = document.getElementById('screen-loading');
            if (loadingScreen) loadingScreen.style.display = 'none';
            verificarSesionActiva();
        }, 1000);

    } catch (error) {
        console.error("Error al cargar altiora.json:", error);
    }
});

function verificarSesionActiva() {
    const sesionActiva = localStorage.getItem('altiora_sesion_activa');
    if (sesionActiva) {
        mostrarAppPrincipal(JSON.parse(sesionActiva));
    } else {
        mostrarPantallaAuth();
    }
}

function mostrarPantallaAuth() {
    const authScreen = document.getElementById('screen-auth');
    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.style.display = 'none';
    if (authScreen) authScreen.style.display = 'flex';
}

function cambiarModoAuth() {
    modoRegistro = !modoRegistro;
    const nombreField = document.getElementById('nombreField');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const toggleBtn = document.getElementById('toggleAuthMode');
    const submitBtn = document.getElementById('authSubmitBtn');

    if (modoRegistro) {
        nombreField.style.display = 'block';
        authTitle.textContent = "Registro de Cuenta";
        authSubtitle.textContent = "Crea tus credenciales para acceder";
        submitBtn.textContent = "Registrarse";
        toggleBtn.textContent = "¿Ya tienes cuenta? Inicia sesión";
    } else {
        nombreField.style.display = 'none';
        authTitle.textContent = "Iniciar Sesión";
        authSubtitle.textContent = "Ingresa con tu cuenta registrada";
        submitBtn.textContent = "Entrar";
        toggleBtn.textContent = "¿No tienes cuenta? Regístrate";
    }
}

function manejarAccionAuth(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    
    let usuariosRegistrados = JSON.parse(localStorage.getItem('altiora_usuarios_db')) || [];

    if (modoRegistro) {
        const nombre = document.getElementById('regNombre').value.trim();
        if (!nombre || !email || !password) {
            alert("Por favor completa todos los campos para registrarte.");
            return;
        }

        const existe = usuariosRegistrados.find(u => u.email === email);
        if (existe) {
            alert("Este correo ya está registrado. Por favor inicia sesión.");
            cambiarModoAuth();
            return;
        }

        const nuevoUsuario = { nombre, email, password, rol: "Estudiante" };
        usuariosRegistrados.push(nuevoUsuario);
        localStorage.setItem('altiora_usuarios_db', JSON.stringify(usuariosRegistrados));

        alert("¡Registro exitoso! Ahora inicia sesión con tus datos.");
        document.getElementById('authForm').reset();
        cambiarModoAuth();

    } else {
        if (!email || !password) {
            alert("Por favor ingresa tu correo y contraseña.");
            return;
        }

        const usuarioEncontrado = usuariosRegistrados.find(u => u.email === email && u.password === password);

        if (!usuarioEncontrado) {
            alert("Correo o contraseña incorrectos, o la cuenta no existe. Regístrate primero si no tienes cuenta.");
            return;
        }

        localStorage.setItem('altiora_sesion_activa', JSON.stringify(usuarioEncontrado));
        
        document.getElementById('screen-auth').style.display = 'none';
        const welcomeScreen = document.getElementById('screen-welcome');
        const welcomeText = document.getElementById('welcomeUserText');
        if (welcomeText) welcomeText.textContent = `¡Bienvenido(a), ${usuarioEncontrado.nombre}!`;
        if (welcomeScreen) welcomeScreen.style.display = 'flex';

        setTimeout(() => {
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            mostrarAppPrincipal(usuarioEncontrado);
        }, 1500);
    }
}

function mostrarAppPrincipal(usuario) {
    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.style.display = 'flex';
    
    const topUserName = document.getElementById('topUserName');
    if (topUserName) topUserName.textContent = `Hola, ${usuario.nombre}`;
    
    const userRoleBadge = document.getElementById('userRoleBadge');
    if (userRoleBadge) userRoleBadge.textContent = `Rol: ${usuario.rol}`;
    
    renderizarDatosDinamicos();
    configurarNavegacionSPA();
}

function renderizarDatosDinamicos() {
    const statProg = document.getElementById('statProgramas');
    if (statProg) statProg.textContent = altioraData.programas.length;

    const statSub = document.getElementById('statSubsidios');
    if (statSub) statSub.textContent = altioraData.subsidios.length;

    const notifList = document.getElementById('notifListContainer');
    const notifCount = document.getElementById('notifCount');
    if (notifList && notifCount) {
        notifList.innerHTML = '';
        notifCount.textContent = altioraData.notificaciones.length;
        altioraData.notificaciones.forEach(n => {
            notifList.innerHTML += `
                <div class="notif-item">
                    <strong>${n.mensaje}</strong>
                    <span class="notif-date">${n.fecha} — ${n.estado}</span>
                </div>
            `;
        });
    }

    filtrarProgramas();

    const subsidiosGrid = document.getElementById('subsidiosGrid');
    if (subsidiosGrid) {
        subsidiosGrid.innerHTML = '';
        altioraData.subsidios.forEach(s => {
            subsidiosGrid.innerHTML += `
                <div class="card">
                    <span class="card-tag">${s.prestamista}</span>
                    <h3>${s.nombre}</h3>
                    <p><strong>Costo Total:</strong> ${s.costo_total}</p>
                    <p><strong>Cobertura:</strong> ${s.porcentaje_cubierto}</p>
                    <p>${s.notas}</p>
                    <button class="btn-card">Consultar Requisitos</button>
                </div>
            `;
        });
    }

    const historialContainer = document.getElementById('historialPostulacionesContainer');
    if (historialContainer) {
        historialContainer.innerHTML = '';
        altioraData.mis_postulaciones.forEach(p => {
            let timelineHTML = '';
            p.historial.forEach(h => {
                timelineHTML += `
                    <div class="timeline-item">
                        <p><strong>Estado:</strong> ${h.estado} (${h.fecha})</p>
                        <p style="font-size:0.82rem; color:#64748B;">${h.motivo}</p>
                    </div>
                `;
            });

            historialContainer.innerHTML += `
                <div class="historial-card">
                    <h3>${p.programa} — ${p.institucion}</h3>
                    <p style="margin-bottom:1rem;"><strong>Estado Actual:</strong> <span class="badge-abierta">${p.estado_actual}</span></p>
                    <h4 style="font-size:0.9rem; margin-bottom:0.5rem; color:#1E3A8A;">Trazabilidad del Proceso:</h4>
                    ${timelineHTML}
                </div>
            `;
        });
    }

    const docsBody = document.getElementById('documentosTableBody');
    if (docsBody) {
        docsBody.innerHTML = '';
        altioraData.documentos_soporte.forEach(d => {
            docsBody.innerHTML += `
                <tr>
                    <td>${d.tipo}</td>
                    <td><span class="badge-verificado">${d.estado}</span></td>
                    <td><a href="${d.url}" style="color:var(--primary-blue); font-weight:600; text-decoration:none;">Ver Soporte</a></td>
                </tr>
            `;
        });
    }
}

function filtrarProgramas() {
    const selectUbicacion = document.getElementById('ubicacionSelect');
    const inputSearch = document.getElementById('searchInput');
    const grid = document.getElementById('programasGrid');
    
    if (!grid) return;

    const ciudadFiltro = selectUbicacion ? selectUbicacion.value : 'todos';
    const textoBusqueda = inputSearch ? inputSearch.value.toLowerCase() : '';
    
    grid.innerHTML = '';

    const filtrados = altioraData.programas.filter(p => {
        const coincideCiudad = (ciudadFiltro === 'todos' || p.ciudad === ciudadFiltro);
        const coincideTexto = p.nombre.toLowerCase().includes(textoBusqueda) || p.institucion.toLowerCase().includes(textoBusqueda);
        return coincideCiudad && coincideTexto;
    });

    if (filtrados.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#94A3B8;">No se encontraron programas con esos criterios.</p>`;
        return;
    }

    filtrados.forEach(p => {
        grid.innerHTML += `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="card-tag">${p.institucion}</span>
                    <span class="${p.estado === 'Abierta' ? 'badge-abierta' : 'badge-proxima'}">${p.estado}</span>
                </div>
                <h3>${p.nombre}</h3>
                <p><strong>Ciudad:</strong> ${p.ciudad} (${p.tipo})</p>
                <p><strong>Requisitos:</strong> ${p.requisitos}</p>
                <p><strong>Beneficios:</strong> ${p.beneficios}</p>
                <button class="btn-card" onclick="abrirFormularioInscripcion('${p.institucion}', '${p.nombre}')">Postularme</button>
            </div>
        `;
    });
}

function toggleNotificaciones() {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

function configurarNavegacionSPA() {
    const navItems = document.querySelectorAll('.sidebar .nav-item[data-target]');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === `section-${targetId}`) {
                    sec.classList.add('active');
                }
            });
        });
    });
}

function solicitarCerrarSesion(e) {
    e.preventDefault();
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'flex';
}

function cancelarCerrarSesion() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'none';
}

function confirmarCerrarSesion() {
    localStorage.removeItem('altiora_sesion_activa');
    location.reload();
}

// ==========================================
// NUEVAS FUNCIONES DE INSCRIPCIÓN Y MODAL
// ==========================================
function abrirFormularioInscripcion(universidad, programa) {
    document.getElementById("modalUniversidad").value = universidad;
    document.getElementById("modalPrograma").value = programa;
    document.getElementById("infoProgramaSeleccionado").innerText = `Postulación a: ${programa} (${universidad})`;
    document.getElementById("modalInscripcion").style.display = "flex";
}

function cerrarFormularioInscripcion() {
    document.getElementById("modalInscripcion").style.display = "none";
    document.getElementById("respuestaModal").innerText = "";
}

document.addEventListener("DOMContentLoaded", () => {
    const formInscripcion = document.getElementById("formInscripcionModal");
    if (formInscripcion) {
        formInscripcion.addEventListener("submit", async function(e) {
            e.preventDefault();

            const datos = {
                universidad: document.getElementById("modalUniversidad").value,
                programa: document.getElementById("modalPrograma").value,
                nombre: document.getElementById("nombreModal").value,
                email: document.getElementById("emailModal").value,
                whatsapp: document.getElementById("whatsappModal").value,
                notif_email: document.getElementById("notifEmailModal").checked,
                notif_whatsapp: document.getElementById("notifWpModal").checked
            };

            try {
                const respuesta = await fetch("http://127.0.0.1:8000/api/inscripcion", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(datos)
                });

                const resultado = await respuesta.json();
                const respDiv = document.getElementById("respuestaModal");
                respDiv.style.color = "#166534";
                respDiv.innerText = resultado.mensaje;

                setTimeout(() => {
                    cerrarFormularioInscripcion();
                    formInscripcion.reset();
                }, 2500);

            } catch (error) {
                const respDiv = document.getElementById("respuestaModal");
                respDiv.style.color = "#dc2626";
                respDiv.innerText = "Error de conexión con el backend FastAPI.";
            }
        });
    }
});