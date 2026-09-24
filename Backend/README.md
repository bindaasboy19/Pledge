# NCSAM Cyber Safety Pledge — Node.js & Express Production Backend

Production MERN backend for the **National Cyber Security Awareness Month / Cyber Safety Pledge** campaign.

## Architecture

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB via Mongoose
- **Validation**: Zod
- **Security**: Helmet, CORS, Express Rate Limit, sanitization, strict body limits
- **Certificate**: PDFKit vector-rendered certificate of commitment
- **Email**: Nodemailer with SMTP and test fallback

---

## API Endpoints

### 1. Health Check
- **`GET /api/health`**
- **Response**:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-09-24T09:00:00.000Z"
}
```

### 2. Live Pledge Counter
- **`GET /api/pledges/count`**
- **Response**:
```json
{
  "success": true,
  "count": 1250
}
```

### 3. Record Pledge Commitment
- **`POST /api/pledges`**
- **Request Body**:
```json
{
  "title": "Mr.",
  "name": "Sanjeev Chaurasia",
  "language": "en",
  "email": "sanjeev@example.com",
  "phone": "9876543210",
  "occupation": "Engineer",
  "organisation": "Naksh Foundation",
  "pledgeAccepted": true,
  "receiveCertificate": true
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Pledge completed successfully. Your certificate has been emailed to your registered email address.",
  "pledgeRecorded": true,
  "certificate": {
    "requested": true,
    "sent": true,
    "reference": "NCSAM-2026-A1B2C"
  }
}
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP Server port | `5000` |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` |
| `MONGODB_URI` | MongoDB connection string (Atlas / local) | *In-memory fallback in dev* |
| `FRONTEND_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `SMTP_HOST` | Outgoing SMTP host | *None (mock in dev)* |
| `SMTP_PORT` | SMTP port (`587` or `465`) | `587` |
| `SMTP_USER` | SMTP username | *None* |
| `SMTP_PASSWORD` | SMTP password | *None* |
| `MAIL_FROM` | Sender email address & display name | `NCSAM Cyber Shield <noreply@naksh.org>` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `900000` (15m) |
| `RATE_LIMIT_MAX_REQUESTS`| Max submissions per window per IP | `20` |

---

## Scripts

```bash
npm start     # Start server
npm run dev   # Start development server with nodemon
npm test      # Run automated test suite
```
