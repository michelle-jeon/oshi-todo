# MVP Plan

Target: functional MVP by Saturday, May 23, with Sunday, May 24 reserved for bug fixes.

## Scope

Must have:

- Email login.
- One auto-created starter character.
- Human/cat selection during onboarding or edit flow.
- Simple color customization.
- Todo create/list/complete.
- XP award on todo completion.
- Basic shop catalog and purchase flow using character XP.
- Data stored in Supabase, not local storage.

Explicitly not in MVP:

- Room editing UI.
- Multiple active characters UI.
- Deep avatar parts.
- Social features.
- Native mobile app.

## Build Order

1. Supabase project setup and migration.
2. Auth screens.
3. Dashboard data loading.
4. Todo CRUD and `complete_todo` RPC.
5. Character preview and color edit.
6. Shop purchase RPC.
7. Responsive pass and bug fixing.

## Suggested Daily Schedule

May 20:

- Lock stack.
- Create repo skeleton.
- Create Supabase project and run migration.

May 21:

- Auth and protected dashboard.
- Starter character loading.
- Todo create/list.

May 22:

- Transactional todo completion and XP.
- Character color customization.
- Initial shop screen.

May 23:

- Purchase flow.
- UI polish.
- Cross-device smoke test.

May 24:

- Bug fixes only.
- Deploy to Vercel.
- Write a short known-issues list.
