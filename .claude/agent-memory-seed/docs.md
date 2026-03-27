# Memory: docs
Last updated: 2026-03-19

## Errores conocidos (max 20)
| Fecha | Error | Archivo | Resolucion |
|-------|-------|---------|------------|
| 2026-03-19 | Section numbers in PLATFORM-CONTEXT shifted when inserting security section | PLATFORM-CONTEXT.md | Fixed: renumbered 8-11 to 8-12 |

## Patterns a evitar (max 10)
| Pattern | Por que | Alternativa |
|---------|---------|-------------|
| Deleting resolved bugs from KNOWN-BUGS.md | Loses audit trail / history | Mark as RESOLVED with date, keep in separate section |
| Duplicating security details across files | Drift risk between KNOWN-BUGS, security-audit, PLATFORM-CONTEXT | Single source in security-audit.md, others cross-reference |

## Decisiones (max 10)
| Fecha | Decision | Contexto |
|-------|---------|----------|
| 2026-03-19 | Added section 8 (Security Posture) to PLATFORM-CONTEXT.md | Security audit resolved 14 issues; platform now has substantial security surface worth documenting as stable reference |
| 2026-03-19 | New bug IDs SEC-* for security items not previously tracked | Telegram, AI injection, XSS, CSP etc. had no BUG-### ID; created SEC-* namespace |
| 2026-03-19 | Open count now 19 (was 16) — 3 resolved but 6 new open items added | SEC-S7, SEC-S9B, SEC-S16, TEST-001, TEST-002 are new; BUG-002/003/004 resolved |
