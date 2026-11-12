FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY . .
ENV PORT=4173
ENV DATA_DIR=/app/data
EXPOSE 4173
VOLUME ["/app/data"]
CMD ["node", "server.mjs"]
