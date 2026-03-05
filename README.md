This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Base de datos D1 (Cloudflare)

La app guarda eventos y reservas en **Cloudflare D1**. Primero debes crear las tablas.

### 1. Tener una base D1 en Cloudflare

- Si ya usas la misma cuenta/DB que en responsibletravel-next: el `database_id` en tu `.env.local` es el de esa base. En `wrangler.toml` está ese mismo ID; solo hay que ejecutar el esquema.
- Si quieres una base **solo para apoinments**: en [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → D1 → Create database (ej. nombre `apoinments-db`). Copia el **Database ID** y ponlo en `.env.local` como `CLOUDFLARE_D1_DATABASE_ID` y en `wrangler.toml` en `database_id`.

### 2. Crear las tablas en D1

Desde la raíz del proyecto, con Wrangler instalado:

```bash
npm install
npm run db:schema
```

O sin añadir wrangler al proyecto:

```bash
npx wrangler d1 execute apoinments-db --remote --file=./scripts/appointments-schema.sql
```

La primera vez puede pedirte login en Cloudflare (`npx wrangler login`).

Para que el admin pueda definir **fechas y horarios disponibles** por tipo de cita, ejecuta también la migración de disponibilidad:

```bash
npm run db:migrate-availability
```

### 3. Variables de entorno

En `.env.local` deben estar (para que la app hable con D1 por API):

- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
