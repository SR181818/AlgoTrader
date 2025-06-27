// Centralized logger utility for the project
// Supports different log levels and can be extended for remote logging

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export class Logger {
  static info(...args: any[]) {
    console.info('[INFO]', ...args);
  }
  static warn(...args: any[]) {
    console.warn('[WARN]', ...args);
  }
  static error(...args: any[]) {
    console.error('[ERROR]', ...args);
    // TODO: Integrate with remote error reporting (e.g., Sentry)
  }
  static debug(...args: any[]) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[DEBUG]', ...args);
    }
  }
}

export default Logger;
