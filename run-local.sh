#!/usr/bin/env bash
set -e

# ==============================================================================
# CodeArena Local Development Helper Script
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

build_runner_image() {
  echo "==> Building multi-lang-runner:latest execution container image..."
  docker build -t multi-lang-runner:latest -f tools/Dockerfile tools/
  echo "==> multi-lang-runner:latest built successfully."
}

start_docker() {
  build_runner_image
  echo "==> Starting all services via Docker Compose..."
  docker compose up --build "$@"
}

setup_env() {
  echo "==> Checking environment files..."
  [ -f .env ] || cp .env.example .env
  [ -f my-app/.env.local ] || cp my-app/.env.example my-app/.env.local
  [ -f websocket/.env ] || cp websocket/.env.example websocket/.env
  [ -f code-executor-service/.env ] || cp code-executor-service/.env.example code-executor-service/.env
  echo "==> Environment files ready."
}

print_help() {
  echo "CodeArena Local Run Script"
  echo ""
  echo "Usage: ./run-local.sh [command]"
  echo ""
  echo "Commands:"
  echo "  docker        Build execution image & start full stack with Docker Compose"
  echo "  build-runner  Build the multi-lang-runner Docker image used for code execution"
  echo "  env           Create default .env files from .env.example templates"
  echo "  help          Show this help message"
}

case "$1" in
  docker)
    setup_env
    shift
    start_docker "$@"
    ;;
  build-runner)
    build_runner_image
    ;;
  env)
    setup_env
    ;;
  help|--help|-h)
    print_help
    ;;
  *)
    if [ -z "$1" ]; then
      setup_env
      start_docker
    else
      echo "Unknown command: $1"
      print_help
      exit 1
    fi
    ;;
esac
