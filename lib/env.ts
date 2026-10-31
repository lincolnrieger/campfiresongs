import "server-only";
import { env } from "cloudflare:workers";
import { site } from "@/config/site";

export function getEnv(): Cloudflare.Env {
  return env;
}

export function db(): D1Database {
  return env.DB;
}

export function appUrl(): string {
  return (env.APP_URL || site.url).replace(/\/$/, "");
}
