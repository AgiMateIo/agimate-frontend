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

# ── Cleanup old tags of this service ─────────────────────
# This runs on a self-hosted runner whose Docker daemon is shared with the backend
# builds, and those start on their own schedule. `docker image prune -f` was global:
# on 14 August it collected the in-flight content ingest of a parallel user-api build,
# which died with `rename …/ingest/…/data → blobs/sha256/…: no such file or directory`.
# `docker rmi -f <ID>` is the same class of mistake — removing by ID drops every tag
# pointing at that image, including a neighbour's. Touch only our own tags, by name.
echo "▶ Removing old ${IMAGE} tags..."
docker images "${IMAGE}" --format '{{.Repository}}:{{.Tag}}' \
  | grep -v ':<none>$' \
  | while read -r REF; do
      docker rmi "$REF" 2>/dev/null || true
    done

# ── Docker build ──────────────────────────────────────────
echo "▶ Building Docker image..."
docker build \
  -t "${IMAGE}:${TAG}" \
  -t "${IMAGE}:latest" \
  .

# ── Docker push ───────────────────────────────────────────
registry_login() {
  echo "${CR_PASSWORD}" | docker login "${REGISTRY}" -u "${CR_USERNAME}" --password-stdin
}

# A push can fail without a lasting cause — a 401 on a blob HEAD request moments after
# a successful login has been seen on this registry. Without a retry, one such refusal
# throws away a finished build. Log in again before each attempt: if the token exchange
# is what broke, retrying with the same stale state just hits the identical 401.
push_with_retry() {
  local ref="$1" attempt=1 max=3
  until docker push "$ref"; do
    if [ "$attempt" -ge "$max" ]; then
      echo "❌ Push failed after ${max} attempts: $ref"
      return 1
    fi
    local delay=$((attempt * 10))
    echo "⚠ Push failed (attempt ${attempt}/${max}), retrying in ${delay}s..."
    sleep "$delay"
    attempt=$((attempt + 1))
    registry_login >/dev/null
  done
}

echo "▶ Logging in to ${REGISTRY}..."
registry_login

echo "▶ Pushing ${IMAGE}:${TAG}..."
push_with_retry "${IMAGE}:${TAG}"
push_with_retry "${IMAGE}:latest"

echo "✅ ${SERVICE} pushed as ${IMAGE}:${TAG}"
