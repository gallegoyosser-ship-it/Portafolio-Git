from fastapi import APIRouter

auth_router = APIRouter()

@auth_router.post("/login")
async def login():
    return {"message": "Login exitoso desde auth_routes"}