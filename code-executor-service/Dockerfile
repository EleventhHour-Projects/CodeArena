# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Run stage
FROM alpine:latest

# Install runtime dependencies
# ca-certificates for HTTPS/TLS
# docker-cli is included if the app needs to call docker commands directly
RUN apk add --no-cache ca-certificates docker-cli

WORKDIR /root/

# Copy the binary from the builder stage
COPY --from=builder /app/main .
# Copy .env if needed (though environment variables are preferred in Docker)
COPY --from=builder /app/.env .

# Expose port (as per api/service.go)
EXPOSE 6969

CMD ["./main"]
