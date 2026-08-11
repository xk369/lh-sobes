# Deploy

Target server: `151.244.243.164`  
Public URL: `https://sobes.151.244.243.164.sslip.io`  
Server path: `/opt/lh-sobes`  
Container: `lh-sobes`  
Local proxy port: `127.0.0.1:3700`

## Safety Rules

- Do not touch existing LOFT HALL production folders.
- Do not stop existing containers.
- Do not edit existing nginx server blocks except adding the new `sobes` block.
- Keep runtime data in `/opt/lh-sobes/data`; it is not committed to GitHub.

## First Deploy

```bash
cd /opt
git clone https://github.com/xk369/lh-sobes.git lh-sobes
cd /opt/lh-sobes
mkdir -p data
docker compose up -d --build
curl -fsS http://127.0.0.1:3700/api/health
```

Install nginx route:

```bash
sudo cp /opt/lh-sobes/deploy/nginx-lh-sobes.conf /etc/nginx/conf.d/lh-sobes.conf
sudo nginx -t
sudo systemctl reload nginx
curl -fsS http://sobes.151.244.243.164.sslip.io/api/health
```

Enable HTTPS with Certbot:

```bash
sudo certbot --nginx -d sobes.151.244.243.164.sslip.io
curl -fsS https://sobes.151.244.243.164.sslip.io/api/health
```

## Update Deploy

```bash
cd /opt/lh-sobes
git pull --ff-only
docker compose up -d --build
curl -fsS http://127.0.0.1:3700/api/health
```
