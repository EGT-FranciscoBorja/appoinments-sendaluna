# Vincular Google Calendar con el administrador del evento

Cuando un visitante reserva una cita, la aplicación puede crear automáticamente un evento en el **Google Calendar del administrador que creó ese tipo de cita** (la cuenta con la que inició sesión en `/admin`).

## Cómo funciona

1. El administrador inicia sesión con Google en `/admin/login`. Al hacerlo, la app pide permiso para **crear eventos en su calendario** (scope `calendar.events`).
2. Los tokens de acceso se guardan de forma segura en la base de datos (tabla `calendar_tokens`).
3. Cuando alguien confirma una reserva para un evento, la app crea un evento en el calendario de Google del **dueño de ese evento** (`owner_email`): título, hora, invitado, email, teléfono y notas.

Así, cada administrador ve en su propio Google Calendar las citas que corresponden a los eventos que él creó.

## Requisitos

- Tener ya configurado el login con Google (ver [SETUP-GOOGLE-LOGIN.md](./SETUP-GOOGLE-LOGIN.md)).
- Activar la **Google Calendar API** en el mismo proyecto de Google Cloud donde tienes el OAuth:
  1. [Google Cloud Console](https://console.cloud.google.com/) → tu proyecto.
  2. **APIs y servicios** → **Biblioteca**.
  3. Busca **Google Calendar API** y actívala.

No hace falta crear nuevas credenciales: se usan las mismas **GOOGLE_CLIENT_ID** y **GOOGLE_CLIENT_SECRET** que ya tienes para el login.

## Migración de base de datos

Ejecuta la migración que crea la tabla de tokens (una sola vez):

```bash
npm run db:migrate-calendar-tokens
```

En local con D1 remoto, o el comando equivalente si usas otro entorno (por ejemplo `wrangler d1 execute apoinments-db --remote --file=./scripts/calendar-tokens-migration.sql`).

## Primera vez que un admin usa la función

1. El administrador debe **cerrar sesión** y volver a **iniciar sesión con Google** (o iniciar sesión por primera vez después de activar esta función).
2. Google mostrará la pantalla de consentimiento incluyendo el permiso para “Gestionar tu Calendario”. Debe aceptar.
3. A partir de ahí, las nuevas reservas de sus eventos se crearán en su Google Calendar.

Si el administrador ya había iniciado sesión antes de activar la Calendar API, debe volver a iniciar sesión para que se pidan los nuevos permisos y se guarden los tokens.

## Zona horaria del evento

El **timezone del evento** (p. ej. Europe/Berlin para ITB Berlin) debe ser el de **donde ocurre el evento**. Las franjas horarias (Specific dates) se interpretan en esa zona. Al crear el evento en Google Calendar se envía esa zona horaria, así que el mismo evento se muestra en la hora local de quien lo ve: si en Berlín son las 09:00, un administrador que abra el calendario desde Ecuador verá 03:00 (o 04:00 según horario de verano). No hace falta configurar nada más.

## Eventos creados en Calendar

Cada reserva genera un evento en el calendario **principal** del administrador con:

- **Título**: nombre del tipo de cita + nombre del invitado (ej. “Consulta 30 min – María García”).
- **Descripción**: invitado, email, teléfono (si se dio) y notas.
- **Ubicación**: la del evento (si está configurada).
- **Inicio y fin**: según la reserva (se respeta la zona horaria del evento/invitado cuando está disponible).

Si en algún momento falla la creación en Calendar (por ejemplo, token expirado o permisos revocados), la reserva **sí se guarda** en la app; solo se registra un aviso en el servidor y el evento no aparece en Google Calendar hasta que el admin vuelva a iniciar sesión para refrescar los tokens.

## Sincronizar reservas que no tienen evento en Calendar

En el panel de admin, pestaña **Bookings**, las reservas que aún no tienen evento en Google Calendar muestran un botón **"Crear en Calendar"**. Al pulsarlo, la app crea el evento en el calendario del dueño del evento y actualiza la reserva. Así puedes recuperar las reservas que fallaron por 403 u otros motivos sin tener que recrear nada a mano.

## Error 403 "Insufficient authentication scopes"

Si en los logs aparece **"Request had insufficient authentication scopes"** al crear el evento en Calendar:

1. **Añadir el scope en Google Cloud Console**  
   En [APIs y servicios → Pantalla de consentimiento de OAuth](https://console.cloud.google.com/apis/credentials/consent) → Editar app → Scopes → Añadir:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar`

2. **Que cada administrador vuelva a autorizar**  
   Los tokens guardados en `calendar_tokens` se crearon con los permisos que había en el momento del login. Si los scopes de Calendar se añadieron después, esos tokens no tienen permiso. Cada admin que vaya a recibir eventos en su calendario debe:
   - Cerrar sesión en la app.
   - Volver a iniciar sesión con Google y **aceptar** la nueva solicitud de acceso al calendario.

3. **Comprobar que la Calendar API está activada**  
   En Google Cloud Console → APIs y servicios → Biblioteca → buscar "Google Calendar API" → Activar.

## Resumen

| Qué | Dónde |
|-----|--------|
| Permisos de Calendar | Se piden al iniciar sesión con Google (scopes `calendar.events` y `calendar`). |
| Tokens | Tabla `calendar_tokens` en D1 (por email del admin). |
| Cuándo se crea el evento | Al confirmarse una reserva (POST a `/api/appointments/bookings`). |
| En qué calendario | Calendario principal del administrador dueño del evento (`owner_email`). |
