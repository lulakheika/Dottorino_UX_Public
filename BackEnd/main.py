from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configurazione CORS più permissiva per il testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost",
        "http://localhost:8000",
        "http://dottorino.pcok.it:3000",
        "http://dottorino.pcok.it",
        "https://dottorino.pcok.it:3000",
        "https://dottorino.pcok.it",
        "https://11.11.154.85:3000"
    ],
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Server is running"}

# Importiamo i router dopo aver creato l'app
from routes import message, auth, agentmessage
app.include_router(message.router)
app.include_router(auth.router)
app.include_router(agentmessage.router, prefix="/api/agentic", tags=["agentic"]) 