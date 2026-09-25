import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: (process.env.NODE_ENV || 'development').trim(),
  PORT: parseInt(process.env.PORT || '5001', 10),
  MONGODB_URI: (process.env.MONGODB_URI || '').trim(),
  FRONTEND_URL: (process.env.FRONTEND_URL || 'http://localhost:5173').trim(),
  PUBLIC_BASE_URL: (process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || 'https://naksh.org').trim(),
  SMTP_HOST: (process.env.SMTP_HOST || '').trim(),
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: (process.env.SMTP_USER || '').trim(),
  SMTP_PASSWORD: (process.env.SMTP_PASSWORD || '').trim(),
  MAIL_FROM: (process.env.MAIL_FROM || 'Naksh Foundation <no-reply@naksh.org>').trim(),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  RATE_LIMIT_PUBLIC_MAX: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || '150', 10),
  RATE_LIMIT_PLEDGE_MAX: parseInt(process.env.RATE_LIMIT_PLEDGE_MAX || process.env.RATE_LIMIT_MAX_REQUESTS || '15', 10),
  RATE_LIMIT_VERIFY_MAX: parseInt(process.env.RATE_LIMIT_VERIFY_MAX || '60', 10),
};

export default ENV;
