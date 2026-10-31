// Worker entry: the vinext app handles requests; the daily cron tidies up
// (deletes unconfirmed submissions after 7 days, expired tokens and so on).
import app from "vinext/server/fetch-handler";
import { cleanup } from "../lib/data/submissions";

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) {
    ctx.waitUntil(cleanup(env.DB));
  },
} satisfies ExportedHandler<Cloudflare.Env>;
