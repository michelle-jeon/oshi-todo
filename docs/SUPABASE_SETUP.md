# Supabase Setup

## Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

Keep `.env.local` out of git. This repo already ignores it.

## Database Schema

The app needs the tables, row-level security policies, and RPC function in:

```text
supabase/migrations/0001_initial_schema.sql
```

Fast MVP path:

1. Open the Supabase project dashboard.
2. Go to `SQL Editor`.
3. Open `/supabase/migrations/0001_initial_schema.sql` in VS Code.
4. Copy the full SQL.
5. Paste it into Supabase SQL Editor.
6. Run it once.

After running it, the app should be able to:

- Sign up users.
- Auto-create a profile and starter character.
- Create todos.
- Complete todos through the `complete_todo` RPC.
- Award XP to the active character.
- Read public shop items.

## Auth Setting

For the fastest local MVP, Supabase Auth can use email and password.

If email confirmation is enabled, sign-up will require clicking the confirmation email before login works. If you want immediate local testing, disable email confirmation temporarily in:

```text
Authentication > Providers > Email
```

Turn confirmation back on before a real public launch.
