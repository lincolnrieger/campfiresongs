// Bindings and variables available to the Worker. See wrangler.jsonc and .env.example.
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    /** Cloudflare Email Service binding. Missing in local dev: emails are logged instead. */
    EMAIL?: SendEmail;
    TURNSTILE_SITE_KEY: string;
    TURNSTILE_SECRET_KEY: string;
    /** Secret used to hash IP addresses and emails for rate limiting. */
    RATE_LIMIT_SECRET: string;
    /** Where "Report a problem" and contact messages go. */
    ADMIN_EMAIL: string;
    /** Public base URL used in email links. Defaults to config/site.ts. */
    APP_URL?: string;
    /** PBKDF2 iterations for password hashing. */
    PASSWORD_ITERATIONS?: string;
    /** Local development only (needs a localhost APP_URL). Never set in production. */
    TURNSTILE_DEV_BYPASS?: string;
  }
}
