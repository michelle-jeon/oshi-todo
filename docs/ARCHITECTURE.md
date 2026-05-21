# OshiTodo Architecture

## Product Shape

OshiTodo is a web-first todo game. A user completes todos, the currently selected character earns XP, and earned XP unlocks character or room customization items.

The MVP supports one active character per account, with a data model that already allows multiple characters, inventory, and room customization.

## Recommended Stack

- Next.js App Router: web MVP, server-rendered pages, route handlers, and future PWA support.
- Supabase Auth: email login and magic links are the fastest low-maintenance path for a solo MVP.
- Supabase Postgres: relational data, row-level security, database functions, and transaction-safe XP updates.
- Supabase Realtime later: useful when the same account is open on multiple devices.
- TypeScript: keeps game data contracts clear as customization grows.

For mobile later, keep domain logic in `src/lib` and database writes behind server actions or RPC calls. A React Native app can reuse the same Supabase backend and most game rules.

## Domain Model

- `profiles`: one row per auth user.
- `characters`: character ownership, species, XP, active selection, customization JSON, and room JSON.
- `todos`: user-owned tasks. Completion records which character received the XP.
- `xp_events`: append-only XP history. It makes double-award bugs easier to catch.
- `shop_items`: catalog for hair, outfits, cat patterns, accessories, mounts, and room items.
- `character_inventory`: purchased items per character.

## Concurrency Rule

Todo completion must be a single database transaction. The `complete_todo` RPC locks the todo row and active character row, marks the todo complete, increments character XP, and inserts one XP event.

That means two devices trying to complete the same todo at the same time cannot both award XP.

## Customization Strategy

MVP customization lives in typed JSON:

- Human: `species`, `hairColor`, `outfitColor`
- Cat: `species`, `furColor`, `patternColor`

Later fields can be added without schema churn:

- `hairStyle`
- `eyeColor`
- `skinColor`
- `outfitId`
- `accessoryIds`
- `mountId`
- `expression`
- `bodyType`

If customization becomes heavily searchable or balance-sensitive, promote specific fields from JSON into columns later.

## Room Strategy

`room_customization` starts as JSON because the MVP does not expose room editing. Keep room item purchases in `shop_items` and `character_inventory`; rendering can later read room-specific payloads from inventory.
