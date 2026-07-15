# --- build stage: compile TypeScript to dist ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
# Compile, then copy the .sql migrations next to the compiled runner so the
# migrate step finds them at dist/db/migrations at runtime.
RUN npm run build && cp -r src/db/migrations dist/db/migrations

# --- runtime stage: only production deps + compiled output ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

EXPOSE 3000
# Run pending migrations (idempotent) then start the server.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
