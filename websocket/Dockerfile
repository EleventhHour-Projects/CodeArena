# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy source and config
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Run stage
FROM node:20-alpine

WORKDIR /app

# Copy production package file
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist
# Copy .env if needed
COPY --from=builder /app/.env .

# Port for the server
EXPOSE 6767

CMD ["npm", "start"]
