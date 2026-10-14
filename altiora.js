let esRegistro = false;
let programasData = [];
let misPostulaciones = JSON.parse(localStorage.getItem('mis_postulaciones')) || [];

const TIEMPO_INACTIVIDAD = 30 * 60 * 1000; // 30 minutos
let temporizadorInactividad;

function reiniciarTemporizador() {
    clearTimeout(temporizadorInactividad);
    localStorage.setItem('ultima_actividad', Date.now());
    
    if (localStorage.getItem('altiora_user')) {
        temporizadorInactividad = setTimeout(() => {
            alert('Su sesión ha expirado por 30 minutos de inactividad.');
            cerrarSesion();
        }, TIEMPO_INACTIVIDAD);
    }
}

['click', 'mousemove', 'keydown', 'scroll'].forEach(evento => {
    document.addEventListener(evento, reiniciarTemporizador);
});

// Control de flujo inicial al cargar la página (5 segundos de splash screen)
document.addEventListener('DOMContentLoaded', () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem('altiora_user'));
    const ultimaActividad = localStorage.getItem('ultima_actividad');

    setTimeout(() => {
        document.getElementById('screen-loading').style.display = 'none';

        if (usuarioGuardado) {
            if (ultimaActividad && (Date.now() - ultimaActividad > TIEMPO_INACTIVIDAD)) {
                cerrarSesion();
            } else {
                mostrarBienvenidaSutil(usuarioGuardado.nombre, () => {
                    iniciarAppPrincipal(usuarioGuardado.nombre);
                    reiniciarTemporizador();
                });
            }
        } else {
            document.getElementById('screen-auth').style.display = 'flex';
        }
    }, 5000); // 5 segundos exactos

    configurarNavegacionYFiltros();
});

// Pantalla de bienvenida sutil de 5 segundos con el nombre del usuario
function mostrarBienvenidaSutil(nombre, callback) {
    const welcomeScreen = document.getElementById('screen-welcome');
    const welcomeText = document.getElementById('welcomeUserText');
    
    welcomeText.textContent = `¡Bienvenido(a), ${nombre}!`;
    welcomeScreen.style.display = 'flex';

    setTimeout(() => {
        welcomeScreen.style.display = 'none';
        if (callback) callback();
    }, 5000); // 5 segundos exactos
}

function cambiarModoAuth() {
    esRegistro = !esRegistro;
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const nombreField = document.getElementById('nombreField');
    const submitBtn = document.getElementById('authSubmitBtn');
    const toggleBtn = document.getElementById('toggleAuthMode');
    
    document.getElementById('authForm').reset();

    if (esRegistro) {
        title.textContent = "Crea tu cuenta en Altiora";
        subtitle.textContent = "Para acceder a becas y convocatorias";
        nombreField.style.display = 'block';
        submitBtn.textContent = "Registrarse";
        toggleBtn.textContent = "Ya tengo cuenta";
    } else {
        title.textContent = "Te damos la bienvenida";
        subtitle.textContent = "Usa tu cuenta de Altiora Edu";
        nombreField.style.display = 'none';
        submitBtn.textContent = "Siguiente";
        toggleBtn.textContent = "Crear cuenta";
    }
}

function procesarAutenticacion(event) {
    event.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const nombre = document.getElementById('regNombre').value;

    if (esRegistro) {
        const nuevoUsuario = { nombre: nombre || email.split('@')[0], email, password };
        localStorage.setItem('altiora_user', JSON.stringify(nuevoUsuario));
        alert('¡Registro exitoso! Cuenta guardada.');
        cambiarModoAuth();
    } else {
        const usuarioGuardado = JSON.parse(localStorage.getItem('altiora_user'));
        if (usuarioGuardado && usuarioGuardado.email === email && usuarioGuardado.password === password) {
            document.getElementById('screen-auth').style.display = 'none';
            
            // Mostrar pantalla de bienvenida sutil de 5 segundos tras iniciar sesión
            mostrarBienvenidaSutil(usuarioGuardado.nombre, () => {
                iniciarAppPrincipal(usuarioGuardado.nombre);
                reiniciarTemporizador();
            });
        } else if (!usuarioGuardado) {
            alert('No hay cuentas registradas. Regístrate primero.');
            cambiarModoAuth();
        } else {
            alert('Correo o contraseña incorrectos.');
        }
    }
}

function iniciarAppPrincipal(nombreUsuario) {
    document.getElementById('screen-loading').style.display = 'none';
    document.getElementById('screen-auth').style.display = 'none';
    document.getElementById('screen-welcome').style.display = 'none';
    document.getElementById('app-container').style.display = 'grid';
    document.getElementById('userGreeting').textContent = nombreUsuario;
    cargarDatos();
}

function cerrarSesion() {
    localStorage.removeItem('altiora_user');
    localStorage.removeItem('ultima_actividad');
    clearTimeout(temporizadorInactividad);
    location.reload();
}

async function cargarDatos() {
    try {
        const response = await fetch('altiora.json');
        const data = await response.json();
        programasData = data.programas;
        renderProgramas(programasData);
        renderMisPostulaciones();
    } catch (error) {
        console.error("Error al cargar altiora.json", error);
    }
}

function renderProgramas(items) {
    const grid = document.getElementById('programasGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94A3B8; padding: 2rem;">No se encontraron convocatorias con los filtros seleccionados.</p>`;
        return;
    }

    items.forEach(item => {
        const badgeClass = item.estado === 'Abierta' ? 'badge-abierta' : 'badge-pendiente';
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div>
                <span class="${badgeClass}">Convocatoria ${item.estado}</span>
                <span class="card-tag" style="margin-top: 0.5rem; display: block;"><i class="fa-solid fa-location-dot"></i> ${item.ciudad} - ${item.institucion}</span>
                <h3 style="margin-top: 0.5rem;">${item.titulo}</h3>
                <p>${item.descripcion}</p>
                <p style="font-size: 0.85rem; color: #475569; margin-top: 0.5rem;"><strong>Inicio Convocatoria:</strong> ${item.apertura}</p>
                <p style="font-size: 0.85rem; color: #475569;"><strong>Cierre Convocatoria:</strong> ${item.cierre}</p>
            </div>
            <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn-card" style="flex:1;" onclick="postularseACarrera(${item.id})">Guardar Postulación</button>
                <a href="${item.linkFormulario}" target="_blank" class="btn-card" style="background:#0F1F38; text-align:center; text-decoration:none; padding: 0.5rem; flex:1;">Ir al Formulario</a>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filtrarPorUbicacion() {
    aplicarFiltrosCombinados();
}

function postularseACarrera(idProg) {
    const programa = programasData.find(p => p.id === idProg);
    if (!programa) return;

    const yaPostulado = misPostulaciones.some(p => p.id === idProg);
    if (yaPostulado) {
        alert(`Ya guardaste la postulación para ${programa.titulo} en la ${programa.institucion}.`);
        return;
    }

    const nuevaPostulacion = {
        ...programa,
        fechaGuardado: new Date().toLocaleDateString()
    };

    misPostulaciones.push(nuevaPostulacion);
    localStorage.setItem('mis_postulaciones', JSON.stringify(misPostulaciones));
    
    alert(`¡Postulación guardada con éxito!\n\nCarrera: ${programa.titulo}\nUniversidad: ${programa.institucion}`);
    renderMisPostulaciones();
}

function renderMisPostulaciones() {
    const grid = document.getElementById('misPostulacionesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (misPostulaciones.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94A3B8; padding: 2rem;">Aún no tienes postulaciones guardadas.</p>`;
        return;
    }

    misPostulaciones.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div>
                <span class="card-tag">Postulación Registrada</span>
                <h3 style="margin-top: 0.5rem;">${item.titulo}</h3>
                <p><strong>Universidad:</strong> ${item.institucion} (${item.ciudad})</p>
                <p><strong>Fecha límite:</strong> ${item.cierre}</p>
                <p style="font-size: 0.85rem; color: #475569;">Guardado el: ${item.fechaGuardado}</p>
            </div>
            <a href="${item.linkFormulario}" target="_blank" class="btn-card" style="background:#1E3A8A; text-align:center; text-decoration:none; display:block; margin-top:1rem; padding:0.75rem;">Ir al Formulario Oficial de la Universidad</a>
        `;
        grid.appendChild(card);
    });
}

function aplicarFiltrosCombinados() {
    const ubicacionSelect = document.getElementById('ubicacionSelect');
    const ubicacionSeleccionada = ubicacionSelect ? ubicacionSelect.value : 'todos';
    
    const searchInput = document.getElementById('searchInput');
    const textoBusqueda = searchInput ? searchInput.value.toLowerCase() : '';
    
    const pillActivo = document.querySelector('.filter-pills .pill.active');
    const filtroEstado = pillActivo ? pillActivo.getAttribute('data-filter') : 'todos';

    const filtrados = programasData.filter(p => {
        const coincideUbicacion = (ubicacionSeleccionada === 'todos') || 
                                  (p.ciudad.toLowerCase() === ubicacionSeleccionada.toLowerCase());
                                  
        const coincideTexto = p.titulo.toLowerCase().includes(textoBusqueda) || 
                              p.institucion.toLowerCase().includes(textoBusqueda);
                              
        const coincideEstado = (filtroEstado === 'todos') || (p.estado === filtroEstado);

        return coincideUbicacion && coincideTexto && coincideEstado;
    });

    renderProgramas(filtrados);
}

function configurarNavegacionYFiltros() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = item.getAttribute('data-target');
            if (!target) return;
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(`section-${target}`).classList.add('active');
        });
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            aplicarFiltrosCombinados();
        });
    }

    const pills = document.querySelectorAll('.filter-pills .pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            aplicarFiltrosCombinados();
        });
    });
}
// Si el usuario escribe algo y presiona Enter, puede buscar directamente en Google si no lo encuentra en Altiora
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query.length > 3) {
                // Abre una pestaña de Google buscando la carrera y la universidad en Colombia
                const urlGoogle = `https://www.google.com/search?q=${encodeURIComponent(query + " convocatorias universidad Colombia admisiones")}`;
                window.open(urlGoogle, '_blank');
            }
        }
    });
}