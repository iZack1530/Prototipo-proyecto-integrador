# Despliegue de Horizon Mythos

Stack: Nginx (sitio estático + proxy), API ASP.NET Core (`/api/`, `/hub/`) y PostgreSQL 17.

## Arranque local

```sh
cd despliegue
cp .env.ejemplo .env        # cambia POSTGRES_PASSWORD y SITIO_URL
docker compose up -d --build
curl http://localhost/api/salud
```

La API aplica la migración inicial al arrancar (`Persistencia__MigrarAutomaticamente=true`).
Las obras de galería se guardan en el volumen `medios` y Nginx las sirve en `/media/`.

## Laboratorio privado

El laboratorio queda detrás de autenticación básica:

```sh
htpasswd -c despliegue/auth/htpasswd equipo
# o, si el archivo ya existe: htpasswd despliegue/auth/htpasswd nuevo-integrante
docker compose restart nginx
```

`despliegue/auth/htpasswd` y `.env` están excluidos del repositorio.

## HTTPS con certbot

1. Apunta el DNS de `lab.<dominio>` al servidor.
2. Emite el certificado (con el stack detenido o usando el modo webroot):

   ```sh
   docker run --rm -v "$PWD/despliegue/certificados:/etc/letsencrypt" \
     -v "$PWD/despliegue/certbot-www:/var/www/certbot" \
     certbot/certbot certonly --webroot -w /var/www/certbot \
     -d lab.<dominio> --email admin@<dominio> --agree-tos --no-eff-email
   ```

3. Copia `nginx-ssl.conf.ejemplo` a `conf.d`, sustituye `lab.EJEMPLO.com` y recarga:

   ```sh
   docker compose exec nginx nginx -s reload
   ```

4. Renovación (cron diario):

   ```sh
   docker run --rm -v "$PWD/despliegue/certificados:/etc/letsencrypt" \
     -v "$PWD/despliegue/certbot-www:/var/www/certbot" \
     certbot/certbot renew --webroot -w /var/www/certbot --quiet && \
     docker compose exec nginx nginx -s reload
   ```

## Firewall

Abre solo:

- `22/tcp` SSH (idealmente limitado por IP).
- `80/tcp` HTTP (redirección y reto de certbot).
- `443/tcp` HTTPS.

PostgreSQL y la API no se publican al host; solo son accesibles en la red interna de Docker.

## Copias de seguridad

Copia diaria de PostgreSQL (cron, 03:00) y retención de 14 días:

```sh
0 3 * * * cd /ruta/Proyecto/despliegue && \
  docker compose exec -T bd pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "/var/backups/horizon-$(date +\%F).sql.gz" && \
  find /var/backups -name 'horizon-*.sql.gz' -mtime +14 -delete
```

Restauración de prueba (siempre antes de un lanzamiento):

```sh
gunzip -c /var/backups/horizon-2026-01-01.sql.gz \
  | docker compose exec -T bd psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

## GitHub Actions

`.github/workflows/despliegue.yml` compila y prueba la solución; si alguna prueba falla, el job de despliegue no se ejecuta. Configura estos secretos:

- `SSH_HOST`
- `SSH_USER`
- `SSH_KEY` (clave privada)
- `RUTA_PROYECTO` (ruta del repo en el servidor)

## Notas

- No publiques `.env`, `auth/htpasswd` ni certificados.
- `/api/salud` debe responder a través de Nginx para dar el despliegue por bueno.
- El catálogo se carga desde `datos_prueba.json`, incluido en la imagen por el Dockerfile.
