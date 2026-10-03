#!/usr/bin/env bash
# Выполняется на VPS через `ssh ... bash -s` из CI. Ожидает переменные окружения:
# API_IMAGE, GHCR_USER, GHCR_TOKEN, DEPLOY_DIR.
set -euo pipefail

cd "$DEPLOY_DIR"
[ -f .env ] || { echo "Нет $DEPLOY_DIR/.env, создайте его (см. README)"; exit 1; }

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
export API_IMAGE

docker compose pull api
docker compose up -d --remove-orphans

# entrypoint сначала применяет миграции, потом стартует API. 401 на /auth/me значит, что API жив.
port="$(grep -E '^API_PORT=' .env | cut -d= -f2 || true)"
for _ in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port:-3000}/api/auth/me" || true)"
  if [ "$code" = "401" ] || [ "$code" = "200" ]; then
    echo "API отвечает ($code), деплой готов: $API_IMAGE"
    docker image prune -f >/dev/null
    docker logout ghcr.io >/dev/null
    exit 0
  fi
  sleep 2
done

echo "API не поднялся за 60 секунд, последние логи:"
docker compose logs --tail=80 api
docker logout ghcr.io >/dev/null
exit 1
