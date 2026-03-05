# Cómo hacer funcionar el botón "Continuar con Google"

## Paso 1: Crear credenciales en Google Cloud Console

1. Entra en **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Crea un proyecto nuevo o elige uno existente (arriba, junto al logo de Google).
3. Ve a **APIs y servicios** → **Credenciales** (menú izquierdo).
4. Pulsa **+ Crear credenciales** → **ID de cliente de OAuth**.
5. Si te pide configurar la pantalla de consentimiento:
   - Tipo de usuario: **Externo** (o Interno si es solo para tu organización).
   - Rellena nombre de la aplicación y correo de asistencia. Guarda.
6. En "Tipo de aplicación" elige **Aplicación web**.
7. **Nombre**: por ejemplo "Apoinments Admin".
8. En **URIs de redirección autorizados** añade:
   - Para desarrollo: `http://localhost:3000/api/auth/callback/google`
   - Para producción: `https://tudominio.com/api/auth/callback/google`
9. Crear. Copia el **ID de cliente** y el **Secreto del cliente** (puedes verlo en el icono de copiar).

---

## Paso 2: Añadir variables en `.env.local`

En la raíz del proyecto (apoinments), abre o crea el archivo **`.env.local`** y añade:

```env
# Obligatorias para el botón de Google
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=un-texto-secreto-muy-largo-y-aleatorio
GOOGLE_CLIENT_ID=xxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxx

# Opcional: solo estos correos podrán entrar al admin (separados por coma).
# Si lo dejas vacío, cualquier cuenta de Google podrá entrar.
ALLOWED_ADMIN_EMAILS=tu-email@gmail.com
```

- **NEXTAUTH_URL**: en local usa `http://localhost:3000`. En producción, tu URL real (ej. `https://apoinments.vercel.app`).
- **NEXTAUTH_SECRET**: genera uno con:
  - Windows (PowerShell): `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])`
  - O en [https://generate-secret.vercel.app/32](https://generate-secret.vercel.app/32)
- **GOOGLE_CLIENT_ID** y **GOOGLE_CLIENT_SECRET**: los que copiaste en el paso 1.
- **ALLOWED_ADMIN_EMAILS**: uno o más emails separados por coma. Solo ellos podrán acceder a `/admin`.

---

## Paso 3: Reiniciar el servidor

Después de guardar `.env.local`:

1. Para el servidor (Ctrl+C si está corriendo).
2. Vuelve a iniciar: `npm run dev`.
3. Abre **http://localhost:3000/admin/login** y pulsa **Continuar con Google**.

Si algo falla, revisa que la URI de redirección en Google Console sea exactamente `http://localhost:3000/api/auth/callback/google` (con `http`, sin barra final).
