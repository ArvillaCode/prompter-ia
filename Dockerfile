FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/api ./api
COPY --from=build /app/tsconfig.json ./

EXPOSE 3001

CMD ["sh", "-c", "node --import tsx api/db/migrate.ts && node --import tsx server/index.ts"]
