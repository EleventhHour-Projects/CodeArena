# Stage 1: Build the Go binary
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy go.mod and go.sum (if it exists)
COPY go.mod go.sum* ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o bot-service main.go

# Stage 2: Create a lightweight runtime image
FROM alpine:latest

# Install CA certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/bot-service .

# Copy the solutions directory (required for the bot to fetch solutions)
COPY --from=builder /app/battle/solutions ./battle/solutions

# Expose the API port
EXPOSE 8000

# Set default environment variables (can be overridden at runtime)
ENV PORT=8000
ENV BACKEND_URL=http://executor-service:6969
ENV APP_URL=http://frontend-service:3000
ENV MATCHMAKING_WSS_URL=ws://executor-service:6970
ENV BATTLE_WSS_URL=ws://express-server:6767

# Run the binary
CMD ["./bot-service"]
