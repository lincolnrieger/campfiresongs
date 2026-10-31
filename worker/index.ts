// Worker entry: the vinext app handles requests (after making sure the
// database tables exist); the daily cron tidies up old data.
import app from "vinext/server/fetch-handler";
import { cleanup } from "../lib/data/submissions";
import { ensureMigrated } from "../lib/migrate";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    await ensureMigrated(env.DB);
    return app.fetch(request, env, ctx);
  },
  async scheduled(_event: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) {
    ctx.waitUntil(ensureMigrated(env.DB).then(() => cleanup(env.DB)));
  },
} satisfies ExportedHandler<Cloudflare.Env>;
