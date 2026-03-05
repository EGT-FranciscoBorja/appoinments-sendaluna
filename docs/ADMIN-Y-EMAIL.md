# Login de administradores y notificaciones por correo

## 1. Login con Google (gratuito)

El panel `/admin` está protegido. Solo pueden entrar quienes tengan una cuenta de Google cuyo email esté en la lista permitida.

### Variables de entorno

Añade a `.env.local`:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=genera-un-string-aleatorio-largo

# Google OAuth (crear en https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret

# Emails que pueden acceder al admin (separados por coma). Si está vacío, cualquier Google puede entrar.
ALLOWED_ADMIN_EMAILS=admin1@ejemplo.com,admin2@ejemplo.com
```

- **NEXTAUTH_SECRET**: genera uno con `openssl rand -base64 32` o en [https://generate-secret.vercel.app/32](https://generate-secret.vercel.app/32).
- **Google Console**: crea un proyecto → APIs y servicios → Credenciales → Crear credenciales → ID de cliente OAuth 2.0. Tipo “Aplicación web”, URL de redirección autorizada: `http://localhost:3000/api/auth/callback/google` (en producción usa tu dominio).

---

## 2. Notificaciones por correo (Mailjet, SMTP)

Cuando un usuario reserva una cita, se puede enviar un correo al responsable del evento. Se usa **Mailjet** por SMTP: [https://dev.mailjet.com/content/guides/](https://dev.mailjet.com/content/guides/).

### Cómo configurar el envío de correos (paso a paso)

1. **Crear cuenta en Mailjet**  
   Entra en [mailjet.com](https://www.mailjet.com), regístrate y verifica tu email o dominio remitente.

2. **Obtener credenciales SMTP**  
   En Mailjet: **Account Settings** → **SMTP & API Keys**. Necesitas la **API Key** (usuario SMTP) y la **Secret Key** (contraseña SMTP). No las compartas ni las subas al repositorio.

3. **Añadir variables al proyecto** 
   En la raíz del proyecto crea o edita `.env.local` y añade:

   ```env
   MAIL_MAILER=smtp
   MAIL_HOST=in-v3.mailjet.com
   MAIL_PORT=587
   MAIL_ENCRYPTION=tls
   MAIL_USERNAME=tu_api_key_mailjet
   MAIL_PASSWORD=tu_secret_key_mailjet
   MAIL_FROM_ADDRESS=info@tudominio.com
   MAIL_FROM_NAME=Appointments
   ```

   Sustituye por tus credenciales de Mailjet. **MAIL_FROM_ADDRESS** debe ser un remitente verificado en Mailjet.

4. **Reiniciar el servidor**  
   Si la app está en marcha, reinicia (`npm run dev`) para que cargue las nuevas variables.

5. **Comprobar que llegan los correos**  
   Crea un tipo de cita con “Email para notificaciones” rellenado, configura horarios y haz una reserva de prueba. El correo debe llegar a esa dirección. Revisa la carpeta de spam si no lo ves.

6. **Si no se envían los correos**  
   Mira la terminal donde corre `npm run dev`. Si faltan credenciales verás `[Mailjet] Email not sent: MAIL_USERNAME and MAIL_PASSWORD must be set...`. Reinicia el servidor después de cambiar `.env.local`.

### Variables de entorno (resumen)

```env
MAIL_HOST=in-v3.mailjet.com
MAIL_PORT=587
MAIL_ENCRYPTION=tls
MAIL_USERNAME=tu_api_key
MAIL_PASSWORD=tu_secret_key
MAIL_FROM_ADDRESS=info@tudominio.com
MAIL_FROM_NAME=Appointments
MAIL_SIGNATURE=<p>—<br/>Your name / Team</p>
```

- **MAIL_USERNAME** / **MAIL_PASSWORD**: API Key y Secret Key de Mailjet (SMTP).
- **MAIL_FROM_ADDRESS**: remitente (debe estar verificado en Mailjet).
- **MAIL_FROM_NAME** (opcional): nombre del remitente.
- **MAIL_SIGNATURE** (opcional): fragmento HTML al final de cada correo (firma).

### A quién se envía el correo

- Si al **crear el tipo de cita** rellenaste “Email para notificaciones”, las reservas de ese evento enviarán el correo a esa dirección.
- Si no hay email en el evento, se usa la variable opcional **MAIL_NOTIFICATION_TO** (un solo correo global).

### Migraciones de la base de datos

- **Email por evento** (solo una vez):

  ```bash
  npm run db:migrate-notification-email
  ```

- **Fechas concretas de disponibilidad** (opcional; para usar “Fechas concretas” en horarios):

  ```bash
  npm run db:migrate-availability-dates
  ```

- **Capacidad por slot y número de asistentes** (varias reservas en el mismo horario + campo asistentes):

  ```bash
  npm run db:migrate-capacity
  ```

- **Propietario por evento** (cada admin solo edita/elimina sus propios eventos):

  ```bash
  npm run db:migrate-owner-email
  ```

---

## Resumen de servicios gratuitos

| Servicio        | Uso                         | Límite / costo      |
|-----------------|----------------------------|----------------------|
| Google OAuth    | Login de administradores   | Gratis               |
| Mailjet         | Envío de correos al reservar (SMTP) | Según plan Mailjet |
| Cloudflare D1   | Base de datos              | Ya en uso en el proyecto |

Cloudflare no ofrece un servicio de envío de emails desde Workers/D1; por eso se usa Mailjet por SMTP (o alternativas como SendGrid/Mailgun).
