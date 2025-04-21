# Usa una versione più recente di Node
FROM node:16-alpine

# Installa le dipendenze necessarie
RUN apk add --no-cache python3 make g++

# Imposta la directory di lavoro
WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Aggiungi react-router-dom al package.json prima dell'installazione
RUN npm install -g npm-add-script && \
    npm install react-router-dom

# Installa le dipendenze
RUN npm install

# Copia il resto dei file
COPY . .

# Imposta la variabile di ambiente per permettere l'accesso esterno
ENV HOST=0.0.0.0
ENV NODE_ENV=development
ENV WATCHPACK_POLLING=true

# Espone la porta su cui l'app verrà eseguita
EXPOSE 3000

# Comando per avviare l'app
CMD ["npm", "start"] 