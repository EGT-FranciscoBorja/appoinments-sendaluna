/**
 * Cross-Account Protection (RISC) event receiver.
 * Google POSTs security event tokens (JWTs) to this endpoint.
 * @see https://developers.google.com/identity/protocols/risc
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { deleteCalendarTokensByRefreshTokenPrefix } from '@/lib/appointments/queries';

const RISC_CONFIG_URL = 'https://accounts.google.com/.well-known/risc-configuration';

const EVENT_TYPES = {
  SESSIONS_REVOKED: 'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked',
  TOKENS_REVOKED: 'https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked',
  TOKEN_REVOKED: 'https://schemas.openid.net/secevent/oauth/event-type/token-revoked',
  ACCOUNT_DISABLED: 'https://schemas.openid.net/secevent/risc/event-type/account-disabled',
  ACCOUNT_ENABLED: 'https://schemas.openid.net/secevent/risc/event-type/account-enabled',
  VERIFICATION: 'https://schemas.openid.net/secevent/risc/event-type/verification',
} as const;

type EventPayload = {
  iss?: string;
  aud?: string;
  iat?: number;
  jti?: string;
  events?: Record<
    string,
    {
      subject?: {
        subject_type?: string;
        iss?: string;
        sub?: string;
        email?: string;
        token_type?: string;
        token_identifier_alg?: string;
        token?: string;
      };
      reason?: string;
      state?: string;
    }
  >;
};

function getClientIds(): string[] {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const ids = (process.env.GOOGLE_CLIENT_IDS?.split(/[,;\s]/) ?? []).map((s) => s.trim()).filter(Boolean);
  const all = id ? [id, ...ids] : ids;
  return [...new Set(all)].filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const rawToken = await request.text();
    if (!rawToken?.trim()) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const clientIds = getClientIds();
    if (clientIds.length === 0) {
      console.error('[RISC] No GOOGLE_CLIENT_ID configured');
      return NextResponse.json({ error: 'Misconfiguration' }, { status: 500 });
    }

    const riscRes = await fetch(RISC_CONFIG_URL);
    if (!riscRes.ok) {
      console.error('[RISC] Failed to fetch RISC config:', riscRes.status);
      return NextResponse.json({ error: 'Config fetch failed' }, { status: 502 });
    }
    const riscConfig = (await riscRes.json()) as { issuer?: string; jwks_uri?: string };
    const issuer = riscConfig.issuer ?? 'https://accounts.google.com/';
    const jwksUri = riscConfig.jwks_uri ?? 'https://www.googleapis.com/oauth2/v3/certs';

    const JWKS = createRemoteJWKSet(new URL(jwksUri));
    const { payload } = await jwtVerify(rawToken, JWKS, {
      issuer,
      audience: clientIds,
      clockTolerance: 999999999,
    });

    const events = (payload as EventPayload).events;
    if (!events || typeof events !== 'object') {
      return NextResponse.json({ error: 'Invalid events' }, { status: 400 });
    }

    for (const [eventType, eventData] of Object.entries(events)) {
      if (eventType === EVENT_TYPES.VERIFICATION) {
        if (eventData?.state != null) {
          console.info('[RISC] Verification event received, state:', eventData.state);
        }
        continue;
      }

      if (eventType === EVENT_TYPES.TOKEN_REVOKED && eventData?.subject) {
        const sub = eventData.subject;
        if (sub.token_type === 'refresh_token' && sub.token_identifier_alg === 'prefix' && typeof sub.token === 'string') {
          const prefix = sub.token.slice(0, 16);
          await deleteCalendarTokensByRefreshTokenPrefix(prefix);
          console.info('[RISC] token-revoked: deleted calendar_tokens for refresh_token prefix');
        }
        continue;
      }

      if (eventType === EVENT_TYPES.TOKENS_REVOKED || eventType === EVENT_TYPES.SESSIONS_REVOKED) {
        const sub = eventData?.subject?.sub;
        if (sub) {
          console.info('[RISC]', eventType, 'for sub:', sub, '- re-auth required for this user');
        }
        continue;
      }

      if (eventType === EVENT_TYPES.ACCOUNT_DISABLED || eventType === EVENT_TYPES.ACCOUNT_ENABLED) {
        const sub = eventData?.subject?.sub;
        const reason = eventData?.reason;
        console.info('[RISC]', eventType, 'sub:', sub, 'reason:', reason);
        continue;
      }

      console.info('[RISC] Unhandled event type:', eventType);
    }

    return new NextResponse(null, { status: 202 });
  } catch (err) {
    console.error('[RISC] Error processing security event:', err);
    return NextResponse.json({ error: 'Invalid token or processing error' }, { status: 400 });
  }
}

/** GET: so you can open the URL in a browser to confirm the endpoint is deployed (Google uses POST). */
export async function GET() {
  return NextResponse.json({
    message: 'Cross-Account Protection (RISC) receiver',
    method: 'POST only (Google sends the security event token in the body)',
    status: 'ok',
  });
}
