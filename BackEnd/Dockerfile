FROM python:3.11

WORKDIR /app

# Installa git e altre dipendenze necessarie
RUN apt-get update && apt-get install -y \
    gcc \
    git \
    curl \
    procps \
    # altri pacchetti che avevi prima...
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia il resto del codice dell'applicazione
COPY . .

# Esponi la porta su cui FastAPI sarà in ascolto
EXPOSE 8000

# Rimuoviamo il CMD poiché è specificato nel docker-compose 