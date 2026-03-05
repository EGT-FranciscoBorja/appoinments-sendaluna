-- Campo para enviar notificación por correo cuando alguien reserve
ALTER TABLE appointment_events ADD COLUMN notification_email TEXT;
