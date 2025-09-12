# Dockerfile per CoworkSpace Backend
FROM node:18-alpine

# Imposta directory di lavoro
WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Installa dipendenze
RUN npm ci --only=production

# Copia codice sorgente
COPY . .

# Crea utente non-root per sicurezza
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Cambia ownership dei file
RUN chown -R nodejs:nodejs /app
USER nodejs

# Esponi porta
EXPOSE 3001

# Comando di avvio
CMD ["npm", "start"]
