# Dockerfile per CoworkSpace Frontend
FROM nginx:alpine

# Copia i file statici del frontend
COPY public/ /usr/share/nginx/html/

# Copia la configurazione nginx personalizzata
COPY nginx.conf /etc/nginx/nginx.conf

# Esponi porta 80
EXPOSE 80

# Comando di avvio (nginx viene avviato automaticamente)
CMD ["nginx", "-g", "daemon off;"]
