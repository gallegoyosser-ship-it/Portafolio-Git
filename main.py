"""API de Altiora Edu. Ejecutar:  uvicorn main:app --reload  (puerto 8000)"""
import os
import traceback
import datetime as dt
import bcrypt, jwt, pymysql
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

load_dotenv()  # lee las credenciales del archivo .env
SECRET = os.getenv("JWT_SECRET", "cambia-esto-en-produccion")
app = FastAPI(title="Altiora Edu API")
@app.middleware("http")
async def errores(request, call_next):
    """Convierte los errores internos en JSON para que el navegador muestre la causa real
    (sin esto, el navegador solo dice "Failed to fetch"). En producción, no devuelvas {e}."""
    try:
        return await call_next(request)
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"detail": f"Error del servidor: {e}"}, status_code=500)


# Solo para desarrollo: acepta la página desde localhost. En producción pon tu dominio.
app.add_middleware(CORSMiddleware, allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
                   allow_methods=["*"], allow_headers=["*"])


def conexion():
    extra = {}
    if os.getenv("DB_SSL_CA"):  # Aiven exige conexión cifrada: ruta al ca.pem descargado
        extra["ssl"] = {"ca": os.getenv("DB_SSL_CA")}
    return pymysql.connect(host=os.getenv("DB_HOST", "127.0.0.1"), port=int(os.getenv("DB_PORT", "3306")),
                           user=os.getenv("DB_USER", "root"), password=os.getenv("DB_PASS", ""),
                           database=os.getenv("DB_NAME", "defaultdb"), charset="utf8mb4",
                           cursorclass=pymysql.cursors.DictCursor, autocommit=True, **extra)


def consulta(sql, args=(), uno=False):
    con = conexion()
    try:
        with con.cursor() as cur:
            cur.execute(sql, args)
            return cur.fetchone() if uno else cur.fetchall()
    finally:
        con.close()


def ejecutar(sql, args=()):
    con = conexion()
    try:
        with con.cursor() as cur:
            cur.execute(sql, args)
            return cur.lastrowid
    finally:
        con.close()


def token(uid):
    return jwt.encode({"sub": str(uid), "exp": dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)}, SECRET, "HS256")


def usuario_actual(authorization: str = Header(None)):
    try:
        return int(jwt.decode((authorization or "").removeprefix("Bearer "), SECRET, algorithms=["HS256"])["sub"])
    except Exception:
        raise HTTPException(401, "Tu sesión venció. Inicia sesión de nuevo.")


def perfil(uid):
    u = consulta("SELECT nombre_completo, email, ciudad_interes FROM usuarios_sistema WHERE id_usuario=%s", (uid,), True)
    if not u:
        raise HTTPException(401, "Usuario no encontrado.")
    favs = [r["id_programa"] for r in consulta("SELECT id_programa FROM favoritos_usuario WHERE id_usuario=%s", (uid,))]
    return {"nombre": u["nombre_completo"] or u["email"], "email": u["email"], "ciudad": u["ciudad_interes"] or "", "favs": favs}


# ---------- Catálogo público (misma forma que altiora.json) ----------
@app.get("/api/catalogo")
def catalogo():
    instituciones = consulta("""
        SELECT i.id_universidadinstitucion AS id, i.nombre, t.tipo,
               COALESCE(u.ciudad, u.municipio, '') AS ciudad,
               c.contacto_telefono AS tel, c.contacto_email AS mail
        FROM institucion_educacion_superior i
        JOIN tipo_institucion t ON t.id_tipo = i.id_tipo
        LEFT JOIN contacto_universidadinstitucion c ON c.id_universidadinstitucion = i.id_universidadinstitucion
        LEFT JOIN ubicacion_universidadinstitucio u ON u.id_ubicacion =
             (SELECT MIN(id_ubicacion) FROM ubicacion_universidadinstitucio WHERE id_universidadinstitucion = i.id_universidadinstitucion)
        ORDER BY i.nombre""")
    programas = consulta("""
        SELECT id_programa AS id, id_universidadinstitucion AS ies, nombre_programa AS nombre, tipo_programa AS tipo,
               fecha_inicio AS ini, fecha_fin AS fin, requisitos AS req, beneficios AS ben FROM tipo_programa""")
    cobertura = consulta("""
        SELECT c.id_programa AS prog,
               CASE WHEN p.tipo_prestamista = 'Persona' THEN 'Prestamista particular' ELSE p.nombre_institucional END AS quien,
               c.tipo_beca_credito AS tipo, c.costo_total AS costo, c.porcentaje_cubierto AS pct,
               CONCAT_WS(' · ', c.duracion_beca, c.plazo_credito) AS dur, c.notas
        FROM cobertura c JOIN prestamista p ON p.id_prestamista = c.id_prestamista""")
    for c in cobertura:
        c["costo"], c["pct"] = float(c["costo"]), round(float(c["pct"]) * 100)
    return {"instituciones": instituciones, "programas": programas, "cobertura": cobertura}


# ---------- Cuentas ----------
class Registro(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    email: str = Field(max_length=100)
    password: str = Field(min_length=8, max_length=72)


class Login(BaseModel):
    email: str
    password: str


@app.post("/api/registro")
def registro(d: Registro):
    email = d.email.strip().lower()
    if "@" not in email:
        raise HTTPException(400, "Escribe un correo válido.")
    if consulta("SELECT 1 FROM usuarios_sistema WHERE email=%s", (email,), True):
        raise HTTPException(409, "Ese correo ya tiene cuenta. Inicia sesión.")
    h = bcrypt.hashpw(d.password.encode(), bcrypt.gensalt()).decode()
    uid = ejecutar("INSERT INTO usuarios_sistema (username, password_hash, email, id_rol, is_active, nombre_completo) "
                   "VALUES (%s,%s,%s,2,1,%s)", (email, h, email, d.nombre.strip()))
    return {"token": token(uid), "user": perfil(uid)}


@app.post("/api/login")
def login(d: Login):
    u = consulta("SELECT id_usuario, password_hash, is_active FROM usuarios_sistema WHERE email=%s", (d.email.strip().lower(),), True)
    try:
        ok = bool(u) and u["is_active"] and bcrypt.checkpw(d.password.encode(), u["password_hash"].encode())
    except ValueError:  # contraseñas antiguas sin bcrypt
        ok = False
    if not ok:
        raise HTTPException(401, "Correo o contraseña incorrectos.")
    return {"token": token(u["id_usuario"]), "user": perfil(u["id_usuario"])}


@app.get("/api/me")
def me(uid: int = Depends(usuario_actual)):
    return perfil(uid)


class Ajustes(BaseModel):
    ciudad: str = Field(default="", max_length=50)


@app.put("/api/me")
def ajustes(d: Ajustes, uid: int = Depends(usuario_actual)):
    ejecutar("UPDATE usuarios_sistema SET ciudad_interes=%s WHERE id_usuario=%s", (d.ciudad or None, uid))
    return perfil(uid)


# ---------- Preferencias (programas guardados) ----------
@app.put("/api/favoritos/{pid}")
def guardar(pid: int, uid: int = Depends(usuario_actual)):
    if not consulta("SELECT 1 FROM tipo_programa WHERE id_programa=%s", (pid,), True):
        raise HTTPException(404, "Ese programa no existe.")
    ejecutar("INSERT IGNORE INTO favoritos_usuario (id_usuario, id_programa, fecha_agregado) VALUES (%s,%s,CURDATE())", (uid, pid))
    return {"ok": True}


@app.delete("/api/favoritos/{pid}")
def quitar(pid: int, uid: int = Depends(usuario_actual)):
    ejecutar("DELETE FROM favoritos_usuario WHERE id_usuario=%s AND id_programa=%s", (uid, pid))
    return {"ok": True}