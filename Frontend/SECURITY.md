# Security & Architecture Guidelines — NCSAM Cyber Safety Pledge Frontend

This document outlines the security architecture and API contract for the National Cyber Security Awareness Month (NCSAM) frontend application.

---

## 1. Client-Side Security & Data Privacy

- **Zero Sensitive Data Persistence**:
  - The application strictly keeps all participant data (email, phone, name) in React memory.
  - Zero sensitive data is persisted to `localStorage`, `sessionStorage`, cookies, or URL search parameters.
  - If the user refreshes or navigates away, memory is cleared cleanly.
- **Strict Console Hygiene**:
  - Production source code contains zero `console.log` statements of participant payloads, email addresses, or backend responses.
- **XSS Prevention**:
  - All dynamic texts (including pledge copy and user names) are rendered as plain text within React JSX bindings (`{pledgeText}`, `{participantName}`).
  - `dangerouslySetInnerHTML` is never used.
- **Duplicate Submission Guards**:
  - Both the participant registration form and the certificate generation trigger feature strict active submission locks (`disabled` attributes + loading spinners).
  - Rapid double-clicking is prevented at the UI layer while relying on the Node.js + Express backend as the ultimate authority.

---

## 2. API Error Normalization & Information Disclosure Defense

- All HTTP responses from the backend flow through `src/api/client.js`.
- Errors are normalized to generic, safe user-facing notices (e.g. *"Unable to connect to the pledge service"*).
- Internal server traces, database errors, or stack traces are intercepted and never rendered to the end-user.

---

## 3. Node.js + Express Backend Integration Contract

The frontend communicates with the Node.js + Express REST backend via configurable endpoints (defined in `src/config/pledgeConfig.js`):

| Action | Method | Path | Request Body | Response Payload |
|---|---|---|---|---|
| Live Pledge Count | `GET` | `/api/pledges/count` | *None* | `{ success: true, count: 1250 }` |
| Submit Pledge Commitment | `POST` | `/api/pledges` | `{ title, name, language, email, phone, profession, organization, receiveCertificate }` | `{ success: true, message, certificate: { requested, sent, reference } }` |

### Environment Configuration:
- `VITE_API_BASE_URL`: Base URL of the Node.js + Express backend (default: `http://localhost:5000` in dev).
- `VITE_PUBLIC_SITE_URL`: Canonical public site URL used for social sharing cards.

> [!CAUTION]
> **No Secrets in Frontend**: Never add private keys, email credentials (SMTP passwords), database credentials, or API secrets to `.env` or client code. Variables prefixed with `VITE_` are publicly accessible in browser bundles.

---

## 4. Production Server Security Headers

The Express backend enforces Helmet security headers:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://<your-api-domain>; object-src 'none'; frame-ancestors 'none';
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```
