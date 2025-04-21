from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt
import datetime

# Importa il modello per la registrazione (da definire)
# from models import UserCreate
# Importa la funzione per ottenere la sessione di database (da definire)
# from database import get_db

router = APIRouter()

SECRET_KEY = "YOUR_SECRET_KEY"  # In un contesto reale, questo valore va gestito tramite variabili d'ambiente

@router.post("/register")
def register(user: dict, db: Session = Depends(lambda: None)):  # Sostituire `dict` con un model pydantic UserCreate e implementare get_db
    # Implementare la logica di creazione utente:
    # - Controllare se l'utente esiste già
    # - Hashare la password e salvare i dati
    return {"msg": "Registrazione avvenuta con successo"}

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(lambda: None)):  # Sostituire get_db
    # Logica base di autenticazione:
    # 1. Verifica dell'utente e della password
    # 2. Se le credenziali sono corrette, genera un token JWT
    token = jwt.encode(
        {
            "sub": form_data.username,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=30)
        },
        SECRET_KEY,
        algorithm="HS256"
    )
    return {"access_token": token, "token_type": "bearer"} 