# National Cyber Awareness Month (NCSAM) - Cyber Safety Pledge

A production-quality, accessible, and secure frontend experience for the **National Cyber Awareness Month (NCSAM) Cyber Safety Pledge** ("The Cyber Shield Project" by Naksh Foundation).

---

## Visual & Brand Palette

Strictly configured in accordance with campaign branding guidelines:
- **White**: `#FFFFFF`
- **Black**: `#050505`
- **Blue**: `#2563EB`
- **Dark Blue**: `#0B1F4D`
- **Pink (Accent)**: `#EC4899`

---

## 5-Stage Complete User Experience

1. **Introduction / Hero**:
   - Cinematic campaign presentation with interactive cyber security nodes converging toward central shield geometry.
   - Distinct values: *Vigilant Practices*, *Privacy Respect*, *Community Safety*.
   - Primary Call-to-Action: **"TAKE THE PLEDGE"**.

2. **Participant Registration**:
   - Clean, focused form: Full Name, Email Address, Mobile Number, Profession, City, Organization.
   - Accessible `<label>` markup, inline validation, and duplicate submission locks.

3. **Immersive Pledge Reading**:
   - Dedication oath: **"READ. REFLECT. COMMIT."**
   - Dynamic natural-speed typing animation with blinking cursor and **"Skip animation"** control.
   - Visual security pathway milestones: *Awareness* $\rightarrow$ *Understanding* $\rightarrow$ *Commitment*.
   - Full accessibility support for `prefers-reduced-motion`.

4. **Formal Acknowledgement Sequence**:
   - Vertical commitment sequence (01, 02, 03) utilizing accessible native checkboxes.
   - **"GENERATE MY CERTIFICATE"** action remains strictly disabled until all 3 commitments are acknowledged.

5. **Ceremonial Certificate Reveal**:
   - Accessible modal with focus trap, Escape key handling, and background scroll lock.
   - Authentic digital certificate layout featuring the official **The Cyber Shield Project / Naksh Foundation** logo, recipient name, official Certificate ID, and issue date.
   - Direct email delivery confirmation: *"Your certificate has been generated successfully. A copy has been sent to your registered email address."*
   - Version 1 exclusions strictly honored: zero social sharing or download placeholder buttons.

---

## Centralized Configuration (`src/config/pledgeConfig.js`)

All temporary pledge copy and acceptance statements are isolated in `src/config/pledgeConfig.js`:

```javascript
// Centralized copy easily replaced or customized
export const PLEDGE_CONFIG = {
  apiEndpoints: {
    pledgeCount: "/api/pledges/count",
    submitPledge: "/api/pledges",
  }
};
```

---

## Node.js + Express Backend Integration

The frontend connects directly to the Node.js + Express REST API via `src/api/client.js` and `src/services/pledgeService.js`.

### Environment Variables

Configure `.env` or `.env.development`:

```env
# Node.js + Express API Host
VITE_API_BASE_URL=http://localhost:5000

# Canonical Public Site URL for sharing
VITE_PUBLIC_SITE_URL=https://ncsam-pledge.vercel.app
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build production bundle
npm run build
```

---

## Security & Privacy Highlights

- **Zero sensitive data in storage**: Participant names, emails, and phone numbers are kept in React memory only.
- **Zero personal data in URLs**: No emails or tokens in query parameters.
- **Safe error messages**: Backend Java stack traces or database errors are never surfaced.
- **No client secrets**: Client bundles contain zero private keys, API secrets, or SMTP credentials.
- See [SECURITY.md](file:///Users/sanjeevchaurasia/Work/NCSAM-Pledge/SECURITY.md) for full details and recommended production headers.
# NCSAM-Pledge
# NCSAM-Pledge
# NCSAM-Pledge
# NCSAM-Pledge
# NCSAM-Pledge
