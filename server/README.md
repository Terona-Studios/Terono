# Terono badge server

A small [Cloudflare Worker](https://developers.cloudflare.com/workers/) with a [D1](https://developers.cloudflare.com/d1/) database that keeps who wears which Terono badge: the OG badge, uploaded badges and Discord-look badges. Everyone who runs Terono downloads the list; only Terono users see the badges. It runs on Cloudflare's free plan.

Changing your own badges needs a one-time **Authorize** inside Discord (a Discord application with the `identify` scope), so nobody can put badges on someone else's profile. Only the Discord user ID is kept, never Discord's access token.

## Setup

1. **Discord application:** [Developer Portal](https://discord.com/developers/applications) → **New Application** ("Terono Badges").
   - **OAuth2** → copy the **Client ID** into `wrangler.toml` (`DISCORD_CLIENT_ID`) and `../badgeConfig.ts` (`BADGE_CLIENT_ID`).
   - **OAuth2 → Redirects** → add `https://terono-badges.<your-subdomain>.workers.dev/authorize` → **Save Changes**.
2. **Cloudflare**, in this folder:
   ```
   npx wrangler login
   npx wrangler d1 create terono-badges
   ```
   Put the printed `database_id` into `wrangler.toml`, then:
   ```
   npx wrangler d1 execute terono-badges --remote --file=schema.sql
   npx wrangler deploy
   npx wrangler secret put DISCORD_CLIENT_SECRET
   ```
   The last one asks for the Client Secret (Developer Portal → OAuth2 → **Reset Secret**).
3. Put the Worker URL into `../badgeConfig.ts` (`BADGE_API`).

## Moderation

Run in this folder (`--remote` = the live database):

```
# everything one user has
npx wrangler d1 execute terono-badges --remote --command "SELECT user_id, slot, name, hash FROM badges WHERE user_id = 'USER_ID'"

# remove one uploaded badge, or all of a user's badges
npx wrangler d1 execute terono-badges --remote --command "DELETE FROM badges WHERE user_id = 'USER_ID' AND slot = 0; UPDATE snapshot SET dirty = 1"
npx wrangler d1 execute terono-badges --remote --command "DELETE FROM badges WHERE user_id = 'USER_ID'; UPDATE users SET official = '[]' WHERE id = 'USER_ID'; UPDATE snapshot SET dirty = 1"

# block a user from changing badges (signs them out; they can sign in again, so combine with the above)
npx wrangler d1 execute terono-badges --remote --command "DELETE FROM sessions WHERE user_id = 'USER_ID'"
```

`UPDATE snapshot SET dirty = 1` makes the next download rebuild the list. Changes made here (not through the plugin) reach people the next time Discord starts, or within a few hours.

## Local testing

```
npx wrangler d1 execute terono-badges --local --file=schema.sql
npx wrangler dev
```
