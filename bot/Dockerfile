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
ENV BACKEND_URL=http://34.131.239.188:6969
ENV APP_URL=http://localhost:3000
ENV SOCKET_BASE_URL=wss://wss.codearena.pro

# Run the binary
CMD ["./bot-service"]
