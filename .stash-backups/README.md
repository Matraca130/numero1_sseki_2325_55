# Stash backups

Patches exported from `git stash` to preserve WIP state across machines.

## stash0-2026-04-19.patch

- Original label: `WIP on claude/automated-security-scanning-3sIF3: 281c7cdd chore: update package-lock.json after npm install`
- Scope: 1338 files, ~219k ins / 219k del — mostly line-ending noise (CRLF↔LF); real content may be mixed in.
- Recovery: `git apply --3way .stash-backups/stash0-2026-04-19.patch` (or `git apply --reject ...` if conflicts).
- Saved: 2026-04-19 during push-everything cleanup; the local stash entry was NOT dropped.
