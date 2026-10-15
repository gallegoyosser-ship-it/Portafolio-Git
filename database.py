from fastapi import FastAPI, UploadFile, File, Form
import mysql.connector  # type: ignore

app = FastAPI()

@app.post("/api/postular")
async def crear_postulacion(
    tipo_doc: str = Form(...),
    num_doc: str = Form(...),
    telefono: str = Form(...),
    correo: str = Form(...),
    file: UploadFile = File(...)
):
    # Conexión a tu XAMPP MySQL
    conexion = mysql.connector.connect(
        host="localhost", user="root", password="", database="altiora_db"
    )
    cursor = conexion.cursor()

    query = "INSERT INTO postulaciones (tipo_documento, numero_documento, telefono, correo, archivo_nombre) VALUES (%s, %s, %s, %s, %s)"
    cursor.execute(query, (tipo_doc, num_doc, telefono, correo, file.filename))
    conexion.commit()

    cursor.close()
    conexion.close()
    return {"mensaje": "¡Postulación guardada en MySQL con éxito!"}

# Conexión a tu base de datos en Aiven
conexion = mysql.connector.connect(
    host="mysql-2f26411d-defaultdb12.f.aivencloud.com",
    port=18374,
    user="avnadmin",
    password="TU_PASSWORD_DE_AIVEN",  # Reemplaza esto con tu contraseña real de Aiven
    database="defaultdb",
    ssl_ca="ca.pem"  # Opcional si descargaste el certificado CA de Aiven
)