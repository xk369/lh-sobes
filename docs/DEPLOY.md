# Deploy

Target server: keep in private ops notes.
Public URL: set through `PUBLIC_APP_URL`.
Server path: keep in private ops notes.
Container/service name: project-specific.
Local proxy port: configure in `docker-compose.yml` or a private override.

## Runtime Vars

- `TELEGRAM_BOT_TOKEN` — токен бота для отправки уведомлений.
- `SELF_EMPLOYMENT_BUTTON_URL` — точная ссылка для кнопки `💳 Самозанятость и выплаты`. Если не задана, используется `https://ravshik.github.io/sz/`.
- `INTERVIEW_STORAGE_MODE` — `json` для локального режима или `postgres` для
  production-связки с общей базой.
- `DATABASE_URL` — строка подключения к общей PostgreSQL-базе.
- `POSTGRES_SSL_MODE` — `disable`, `require` или `verify-full`.
- `PUBLIC_APP_URL` — публичный HTTPS URL мини-приложения. Нужен для Telegram
  action-ссылок в уведомлениях.

## Safety Rules

- Do not touch existing LOFT HALL production folders.
- Do not stop existing containers.
- Do not edit existing nginx server blocks except adding the new `sobes` block.
- In JSON mode keep runtime data in the server data directory; it is not
  committed to GitHub.
- In PostgreSQL mode import/backup JSON before switching and keep exact
  production paths/checksums in private server-only notes.
- Candidate pages are public, but recruiter state/actions require a verified Telegram WebApp user from the whitelist.

## First Deploy

```bash
cd /opt
git clone https://github.com/xk369/lh-sobes.git <app-dir>
cd <app-dir>
mkdir -p data
docker compose up -d --build
curl -fsS http://127.0.0.1:<local-port>/api/health
```

Install nginx route:

```bash
sudo cp /opt/<app-dir>/deploy/nginx-lh-sobes.conf /etc/nginx/conf.d/lh-sobes.conf
sudo nginx -t
sudo systemctl reload nginx
curl -fsS http://<public-domain>/api/health
```

Enable HTTPS with Certbot:

```bash
sudo certbot --nginx -d <public-domain>
curl -fsS https://<public-domain>/api/health
```

## Update Deploy

```bash
cd /opt/<app-dir>
git pull --ff-only
docker compose up -d --build
curl -fsS http://127.0.0.1:<local-port>/api/health
```
