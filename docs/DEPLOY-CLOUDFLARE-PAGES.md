# Desplegar en Cloudflare (conexión con GitHub)

Cuando conectas tu repositorio de GitHub a Cloudflare, el despliegue se configura en el **dashboard**. Este proyecto usa **@opennextjs/cloudflare** (OpenNext), el adapter recomendado por Cloudflare para Next.js 16 (soporta API routes, NextAuth y D1).

> **Nota:** `@cloudflare/next-on-pages` está deprecado y no soporta Next.js 16. Usa **@opennextjs/cloudflare**.

---

## Valores para el formulario "Build" (Deploy command obligatorio)

En la pantalla **Build** donde "Deploy command" es **Required**, usa:

| Campo | Valor |
|-------|--------|
| **Build command** | `npx opennextjs-cloudflare build` |
| **Deploy command** | `npx opennextjs-cloudflare deploy` |
| **Path** | `/` (por defecto) |

El adapter ya está instalado (`@opennextjs/cloudflare`). Haz push a GitHub para que Cloudflare ejecute el build y el deploy.

- **Build:** ejecuta `next build` y luego el paso de OpenNext (salida en `.open-next/`).
- **Deploy:** sube la app como **Cloudflare Worker** (con assets). La app se sirve como Worker, no como sitio estático de Pages.

Si prefieres solo front estático (sin API en Cloudflare), ver **Opción B** más abajo.

---

## Configuración del proyecto (ya aplicada)

- **open-next.config.ts**: obligatorio para que el build en CI no pregunte si crear el archivo (en Cloudflare no hay teclado para responder). Config mínima con `defineCloudflareConfig({})`.
- **wrangler.jsonc**: define el Worker (entry `.open-next/worker.js`, assets, D1, `nodejs_compat`). Wrangler usa este archivo cuando existe junto con `wrangler.toml`.
- **wrangler.toml**: se mantiene para referencia; los scripts `db:schema`, `db:migrate-*` usan la base `apoinments-db` (también definida en `wrangler.jsonc`).
- **next.config.ts**: incluye `initOpenNextCloudflareForDev()` para desarrollo local con bindings.
- **Scripts en package.json**: `npm run preview` (build + preview local), `npm run deploy` (build + deploy a Cloudflare).

---

## Errores frecuentes

### Build en Vercel: `workerd: GLIBC_2.35 not found` / `EPIPE`

Este proyecto está pensado para **Cloudflare** (D1, Workers, OpenNext). Si conectas el repo a **Vercel**, el build puede fallar porque el binario `workerd` de Cloudflare requiere una glibc más nueva que la del entorno de Vercel.

**Solución:** Despliega en **Cloudflare Pages**, no en Vercel. En Cloudflare Dashboard → Workers & Pages → Connect to Git → elige este repo y usa los comandos de build/deploy de la sección anterior. Si usas Vercel por otro motivo, el build está condicionado (`next.config.ts`) para no cargar OpenNext cuando `VERCEL=1`, pero la app no podrá usar D1/Workers en Vercel.

### "assets.directory does not exist" / "wrangler deploy"

Si el deploy falla con errores de `assets.directory` o `wrangler deploy`:

- Asegúrate de usar **Deploy command:** `npx opennextjs-cloudflare deploy` (no `npx wrangler deploy` ni `npx wrangler pages deploy ...`).
- OpenNext genera `.open-next/` y usa esa salida en el deploy.

### "Missing required open-next.config.ts" / build se queda esperando Y/n

Si el build falla con un mensaje como **Missing required \`open-next.config.ts\` file, do you want to create one? (Y/n)**:

- En CI (Cloudflare, GitHub Actions, etc.) no hay entrada interactiva, por eso falla.
- Solución: tener en la raíz del proyecto un archivo **open-next.config.ts** (aunque sea con config vacía). En este repo ya está creado.

### Conflicto con @cloudflare/next-on-pages

Si intentaste instalar `@cloudflare/next-on-pages` y aparece **ERESOLVE** (peer dependency con Next 16):

- No instales `@cloudflare/next-on-pages`; no soporta Next 16.
- Usa solo `@opennextjs/cloudflare` (ya en el proyecto).

---

## 1. Crear el proyecto en Cloudflare

1. Entra en [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**.
2. **Create application** → **Pages** (o **Workers**) → **Connect to Git**.
3. Elige **GitHub**, autoriza Cloudflare y selecciona el repositorio `apoinments` y la rama (p. ej. `main`).

## 2. Configuración de build

### Opción A: Next.js con OpenNext (recomendado; ya configurado)

Para API routes, NextAuth y D1:

1. En el **dashboard** → tu proyecto → **Build**:
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command (obligatorio):** `npx opennextjs-cloudflare deploy`
   - **Build output directory:** no suele ser necesario (OpenNext gestiona la salida).

2. **Variables de entorno:** **Settings** → **Environment variables** (Production/Preview):  
   `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, Mailjet, etc.  
   Si usas D1 vía API (env), configura también `CLOUDFLARE_D1_DATABASE_ID` y el token/account si aplica.  
   Si en el futuro usas el binding D1 en código con `getCloudflareContext().env.DB`, el binding ya está en `wrangler.jsonc`.

### Opción B: Export estático (sin API en Cloudflare)

Solo si quieres desplegar solo el front:

1. En `next.config.ts` añade `output: 'export'` (y adapta o quita rutas que usen API/server).
2. En Cloudflare **Build**:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler pages deploy out`
   - **Build output directory:** `out`

## 3. Variables de entorno en Cloudflare

En tu proyecto → **Settings** → **Environment variables** configura al menos:

- `NEXTAUTH_URL` → URL de producción (ej. `https://apoinments.pages.dev` o la URL que asigne Cloudflare)
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- Variables de Mailjet (MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_ADDRESS, etc.)
- Si usas D1 vía env: `CLOUDFLARE_D1_DATABASE_ID`, etc.

## 4. Resumen

- **Deploy desde GitHub:** Build command = `npx opennextjs-cloudflare build`, Deploy command = `npx opennextjs-cloudflare deploy`.
- La app se despliega como **Worker** con assets (OpenNext), compatible con Next.js 16, API routes y D1.
- **wrangler.jsonc** = configuración del Worker y D1 para build/deploy. **wrangler.toml** = se mantiene; los scripts `db:*` siguen funcionando (Wrangler usa `wrangler.jsonc` si está presente).
- Si algo falla, revisa el log del deploy en **Deployments** y que los comandos de Build y Deploy coincidan con la opción (A o B) que uses.
