# Versioning

OshiTodo uses simple semantic versioning while the app is small.

Format:

```text
MAJOR.MINOR.PATCH
```

## While Pre-Launch

- `0.1.x`: local MVP scaffolding and early playable prototype.
- `0.2.x`: web MVP complete enough to show other people.
- `0.3.x`: polish, balance, wardrobe/shop improvements, and deployment hardening.
- `0.4.x`: desktop focus tracker exploration or PWA/mobile experiments.
- `1.0.0`: first public release.

## When To Bump

- Patch: small bug fixes, copy changes, minor UI polish.
- Minor: a new user-facing feature such as calendar, shop, wardrobe, or Pomodoro/focus XP.
- Major: breaking product or data model changes after public launch.

## Current Practice

- Update `package.json` version when a meaningful feature set is done.
- Add a short note to `CHANGELOG.md`.
- Commit with a clear message.
- Tag important milestones later, for example `v0.2.0`.
