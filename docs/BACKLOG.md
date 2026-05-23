# Post-MVP Backlog

This is the parking lot for features and polish items that should wait until the MVP is usable end to end.

## Auth

- Password reset flow.
  - Add a "forgot password" link on `/login`.
  - Use Supabase password recovery email.
  - Add a reset password page for users returning from the recovery link.
- Email confirmation UX.
  - Show clearer states for "check your email" and "confirmed, now login".
- Social login.
  - Consider Google login after the email/password MVP is stable.
- Account settings.
  - Change email.
  - Change password.
  - Delete account.

## Character System

- Save character customization to Supabase instead of keeping the selector local-only.
- Add multi-character support.
  - Create a new character.
  - Switch active character.
  - Show each character's separate XP and inventory.
- Expand avatar species.
  - Dog.
  - Elf.
  - Fairy.
  - More fantasy species.
- Expand human customization.
  - Hair style.
  - Hair color.
  - Eye color.
  - Skin color.
  - Outfit and outfit color.
  - Accessories.
  - Facial expression.
  - Body type.
  - Mount and mount color.
- Add color-specific or item-specific detail variants.
  - Example: ribbon changes shape based on color.

## XP And Economy

- Separate lifetime XP from spendable currency more clearly.
- Add shop purchase flow.
  - Prevent duplicate purchases.
  - Deduct spendable XP.
  - Add purchased items to character inventory.
- Add item equip/unequip flow.
- Add XP reward tuning.
  - Different XP values by todo difficulty.
  - Daily bonus.
  - Streak bonus.
- Add XP event history view.

## Todo System

- Add due dates.
- Add priority.
- Add tags/categories.
- Add recurring todos.
- Add notes/details.
- Add completed todo archive view.
- Add undo after completion.
- Add optimistic UI states for faster feedback.

## Room System

- Add character room view.
- Add room customization.
  - Wallpaper.
  - Floor.
  - Furniture placement.
  - Room item inventory.
- Add room shop items.

## Sync And Platform

- Add Supabase Realtime for multi-device sync.
- Add PWA support.
  - Installable web app.
  - Offline shell.
  - App icons.
- Plan mobile app path.
  - React Native or Expo using the same Supabase backend.

## Design And Product Polish

- Replace placeholder generated PNG assets with final art assets.
- Define a consistent asset naming convention.
- Add empty, loading, and error states.
- Improve mobile layout.
- Add motion feedback for todo completion and XP gain.
- Add sound settings later if the game feel needs it.

## Admin And Operations

- Add seed scripts for shop items.
- Add safer migration workflow with Supabase CLI.
- Add staging and production Supabase projects.
- Add deployment environment variable checklist.
- Add analytics for activation.
  - Sign-up completion.
  - First todo created.
  - First todo completed.
  - First item purchased.
