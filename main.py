from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import os
from src.routes.auth_routes import auth_router


# 1. Inicialización de la aplicación FastAPI
app = FastAPI(
    title="API Altiora Edu",
    description="Backend para la plataforma de educación superior y becas",
    version="1.0.0"
)

# Incluimos el router en la app principal
app.include_router(auth_router, prefix="/auth", tags=["auth"])

# 2. Configuración de CORS (Permite solicitudes desde tu frontend/HTML)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Modelos Pydantic para validación de datos
class Item(BaseModel):
    name: str
    age: int

class InscripcionRequest(BaseModel):
    universidad: str
    programa: str
    nombre: str
    email: str
    whatsapp: str
    notif_email: bool
    notif_whatsapp: bool

# 4. Eventos de inicio y cierre de la aplicación
@app.on_event("startup")
async def startup_event():
    print("La aplicación Altiora Edu está arrancando...")

@app.on_event("shutdown")
async def shutdown_event():
    print("La aplicación Altiora Edu se está cerrando...")

# 5. Rutas HTTP principales
@app.get('/')
async def read_root():
    return {"message": "hello world"}

@app.get('/api/convocatorias')
async def obtener_convocatorias():
    db = sqlite3.connect("items.db")
    cursor = db.cursor()
    db.close()

    datos_ejemplo = [
        {
            "institucion": "ITM (Inst. Tecnológico Metropolitano)",
            "ciudad": "Medellín",
            "programa": "Tecnología en Desarrollo de Software",
            "inicio": "1 de Octubre de 2026",
            "cierre": "30 de Noviembre de 2026"
        },
        {
            "institucion": "Universidad EAFIT",
            "ciudad": "Medellín",
            "programa": "Ingeniería de Sistemas",
            "inicio": "15 de Septiembre de 2026",
            "cierre": "15 de Diciembre de 2026"
        }
    ]
    return {"convocatorias": datos_ejemplo}

# Endpoint para recibir las postulaciones desde la página web
@app.post('/api/inscripcion')
async def registrar_inscripcion(datos: InscripcionRequest):
    # Opcional: Guardar el registro en tu base de datos SQLite (items.db)
    db = sqlite3.connect("items.db")
    cursor = db.cursor()
    # Asegúrate de tener una tabla creada para inscripciones si deseas almacenarlas de forma permanente
    db.close()

    print(f"\n[NUEVA INSCRIPCIÓN RECIBIDA]")
    print(f"Estudiante: {datos.nombre} | Institución: {datos.universidad} | Programa: {datos.programa}")

    if datos.notif_email:
        print(f"--> [SIMULACIÓN EMAIL] Enviado a {datos.email}")
    if datos.notif_whatsapp:
        print(f"--> [SIMULACIÓN WHATSAPP] Enviado al {datos.whatsapp}")

    return {
        "status": "exito",
        "mensaje": f"¡Inscripción registrada con éxito para {datos.nombre}! Te notificaremos los avances."
    }

@app.post('/items')
async def create_item(item: Item):
    db = sqlite3.connect("items.db")
    cursor = db.cursor()
    db.close()
    return {"item": item, "name": item.name, "age": item.age}

# 6. Ejemplo de ruta de autenticación integrada
@app.post('/auth/login')
async def login():
    return {"message": "Login exitoso"}

# 7. Configuración de WebSockets para tiempo real
connected_clients = []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except Exception:
        connected_clients.remove(websocket)

# 8. Punto de entrada para ejecutar la API con Uvicorn
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)