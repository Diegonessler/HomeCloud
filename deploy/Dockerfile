# HomeCloud — imagem do backend + site (leve: ~60 MB em disco, ~40 MB de RAM)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 PUBLIC_DIR=/app/public DATA_DIR=/data
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server/server.mjs ./
COPY server/lib ./lib
COPY public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=60s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.mjs"]
