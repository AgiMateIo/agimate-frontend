#!/bin/bash
set -euo pipefail

# ──────────────────────────────────────────────────────────
# Build and push Docker image to Container Registry
#
# Usage:   ./ci/build-and-push.sh <service-name>
# Example: ./ci/build-and-push.sh frontend
#
# Environment variables:
#   REGISTRY                 — Container Registry URL
#   CR_USERNAME              — Container Registry login
#   CR_PASSWORD              — Container Registry password
#   NEXT_PUBLIC_API_BASE_URL — API gateway URL (baked into bundle)
# ──────────────────────────────────────────────────────────

SERVICE=$1
TAG="${TAG:-$(git describe --tags --always)}"

if [ -z "$SERVICE" ]; then
  echo "❌ Service name required: ./ci/build-and-push.sh <service-name>"
  exit 1
fi

if [ -z "${REGISTRY:-}" ]; then
  echo "❌ REGISTRY is not set"
  exit 1
fi

if [ -z "${CR_USERNAME:-}" ] || [ -z "${CR_PASSWORD:-}" ]; then
  echo "❌ CR_USERNAME and CR_PASSWORD must be set"
  exit 1
fi

IMAGE="${REGISTRY}/${SERVICE}"

echo "════════════════════════════════════════════════════════"
echo "  Service:  ${SERVICE}"
echo "  Image:    ${IMAGE}:${TAG}"
echo "════════════════════════════════════════════════════════"

# ── Cleanup old images (older than 3h) ───────────────────
echo "▶ Cleaning up old ${IMAGE} images (older than 3h)..."
THRESHOLD=$(date -d '3 hours ago' +%s)
docker images "${IMAGE}" --format '{{.ID}} {{.CreatedAt}}' | sort -u | while read -r ID REST; do
  CREATED=$(date -d "$(echo "$REST" | sed 's/ [A-Z]*$//')" +%s 2>/dev/null || echo 0)
  if [ "$CREATED" -lt "$THRESHOLD" ]; then
    docker rmi -f "$ID" 2>/dev/null || true
  fi
done

# ── Docker build ──────────────────────────────────────────
BUILD_ARGS=()
if [ -n "${NEXT_PUBLIC_API_BASE_URL:-}" ]; then
  BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}")
fi

echo "▶ Building Docker image..."
docker build \
  "${BUILD_ARGS[@]}" \
  -t "${IMAGE}:${TAG}" \
  -t "${IMAGE}:latest" \
  .

# ── Docker push ───────────────────────────────────────────
echo "▶ Logging in to ${REGISTRY}..."
echo "${CR_PASSWORD}" | docker login "${REGISTRY}" -u "${CR_USERNAME}" --password-stdin

echo "▶ Pushing ${IMAGE}:${TAG}..."
docker push "${IMAGE}:${TAG}"
docker push "${IMAGE}:latest"

echo "✅ ${SERVICE} pushed as ${IMAGE}:${TAG}"
