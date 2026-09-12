# Guia de despliegue

## 1. Base de datos (Neon)
1. Crear proyecto Neon y ejecutar `db/schema.sql`.
2. Copiar la cadena de conexion como `DATABASE_URL`.

## 2. Vercel
1. Importar el repositorio de GitHub como nuevo proyecto (o vincularlo con
   `create_git_project` para despliegue automatico en cada push).
2. Variables de entorno: `DATABASE_URL`, `CF_ACCOUNT_ID`, `CF_API_TOKEN`.
3. Cada push a `main` genera un despliegue de produccion automatico.

## 3. Cloudflare (opcional)
Dominio detras de Cloudflare para CDN/WAF, Turnstile en el formulario.

## Variables de entorno
Ver `.env.example`.
