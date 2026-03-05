# Google OAuth: Privacy policy, incremental authorization and Cross-Account Protection

## Privacy policy URL (OAuth verification)

Google requires a privacy policy that states **with whom you share, transfer, or disclose Google user data**. This app provides a dedicated policy at **`/privacy-policy`** that includes:

- What data we collect (including from Google sign-in and Calendar).
- **Sharing, transfer, and disclosure:** We do not sell data; we do not share Google user data with third parties for advertising. We disclose only to: Cloudflare (hosting/database), Mailjet (email delivery), and Google (OAuth/Calendar APIs). No other third parties receive Google user data.

In **Google Cloud Console** → your project → **OAuth consent screen** (or OAuth client configuration), set the **Privacy policy URL** to:

**`https://appointments.responsibletravelsa.com/privacy-policy`**

After deploying, resubmit your app for verification with this URL.

## Incremental authorization

The app is configured to use **incremental authorization** as recommended by Google ([OAuth 2.0 for Web Server Applications - Incremental authorization](https://developers.google.com/identity/protocols/oauth2/web-server#incrementalAuth)).

In `auth.ts`, the Google provider includes `include_granted_scopes: 'true'` in the authorization params. That way, when users sign in again (e.g. to grant new scopes like Calendar), the new token can include previously granted scopes and the consent flow is clearer.

If Google Cloud Console still shows a warning like *"One or more of your OAuth clients may not properly support incremental authorization"*, ensure:

1. The deployed app uses the updated code (with `include_granted_scopes`).
2. You are using the correct OAuth client (same Client ID as in the warning). Re-run the login flow so the next authorization request is sent with the new parameter.

## Cross-Account Protection (RISC)

This app exposes a RISC receiver at **`/api/security-events`** (POST; body = raw JWT). It validates the token and on **token-revoked** deletes the matching `calendar_tokens` row; other events are logged. Use your full URL (e.g. `https://appointments.responsibletravelsa.com/api/security-events`) when registering with Google.

The **App security** section in Google Cloud Console may show: *"Your project is not configured for Cross-Account Protection."*

[Cross-Account Protection (RISC)](https://developers.google.com/identity/protocols/risc) lets Google send security event notifications (e.g. account disabled, token revoked) to an endpoint you host. You can then react (e.g. end sessions, revoke stored tokens).

Configuring it is **optional** but improves security. It is done outside this app’s auth flow:

1. **Enable RISC API** in the same Google Cloud project (APIs & Services → Library → search “RISC”).
2. **Create a service account** with the **RISC Configuration Admin** role (`roles/riscconfigs.admin`).
3. **Implement an HTTPS endpoint** (e.g. `/api/security-events` or similar) that:
   - Accepts POST requests with a security event token (JWT).
   - Validates the token using Google’s RISC configuration and your OAuth client IDs.
   - Handles event types (e.g. `sessions-revoked`, `token-revoked`, `account-disabled`) and updates your app (e.g. invalidate sessions or stored refresh tokens).
4. **Register the endpoint** with the RISC API (POST to `https://risc.googleapis.com/v1beta/stream:update` with the endpoint URL and desired event types), using the service account to authenticate.

Full steps and examples: [Protect user accounts with Cross-Account Protection](https://developers.google.com/identity/protocols/risc).

The other items in **App security** (send token securely, no WebViews for auth, secure OAuth flows) are already satisfied by using NextAuth with the Google provider and server-side token handling.
