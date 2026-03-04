FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY server.js app.js admin.js user.js ./
COPY admin.html user.html index.html styles.css README.md ./
COPY data ./data
COPY run-local.sh ./run-local.sh

EXPOSE 4173

CMD ["npm", "start"]
