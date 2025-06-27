// src/monitoring/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0, // Adjust for production
  environment: process.env.NODE_ENV || 'development',
  release: process.env.RELEASE || 'dev',
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
});

export default Sentry;
