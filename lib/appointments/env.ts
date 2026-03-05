// Configuración para la base de datos de citas en Cloudflare D1
// Usa la misma D1 principal del proyecto (CLOUDFLARE_D1_DATABASE_ID)
export const APPOINTMENTS_D1_CONFIG = {
  databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
} as const;

export const validateAppointmentsEnv = () => {
  const missing: string[] = [];
  if (!APPOINTMENTS_D1_CONFIG.databaseId) missing.push('CLOUDFLARE_D1_DATABASE_ID');
  if (!APPOINTMENTS_D1_CONFIG.apiToken) missing.push('CLOUDFLARE_API_TOKEN');
  if (!APPOINTMENTS_D1_CONFIG.accountId) missing.push('CLOUDFLARE_ACCOUNT_ID');
  if (missing.length > 0) {
    throw new Error(`Variables de entorno faltantes para citas: ${missing.join(', ')}`);
  }
  return true;
};
