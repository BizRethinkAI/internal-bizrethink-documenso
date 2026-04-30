# overlays/ — targeted patches to upstream files

This directory contains patches applied on top of upstream Documenso files. **Every patch must have a header explaining intent + fragility estimate.** See `UPSTREAM.md` for conventions.

## Active patches

| # | Patch | Status | Fragility | Why we need it |
|---|---|---|---|---|
| 001 | `001-add-bizrethink-claim-tier.patch` | **APPLIED 2026-04-29** | MEDIUM | Adds a 7th `BIZRETHINK` tier to `INTERNAL_CLAIM_ID` + `internalClaims` in `packages/lib/types/subscription.ts`. Mirrors ENTERPRISE flags; HIPAA + allowLegacyEnvelopes intentionally omitted. Pairs with overlay 002. |
| 002 | `002-route-org-creation-to-bizrethink-tier.patch` | **APPLIED 2026-04-29** | LOW | Repoints all three org-creation call sites (`createPersonalOrganisation`, `createOrganisationRoute`, `createAdminOrganisationRoute`) from `INTERNAL_CLAIM_ID.FREE` to `INTERNAL_CLAIM_ID.BIZRETHINK`. Single-token swaps; admin route also gains an import. |
| 003 | `003-build-heap-size.patch` | **APPLIED 2026-04-30** | LOW | Adds `ENV NODE_OPTIONS="--max-old-space-size=4096"` in `docker/Dockerfile` before the turbo build step. Documenso's tsc + react-router build OOMs at Node's default ~1GB heap. Build container needs ≥4GB available RAM. |
| 004 | `004-add-bizrethink-to-claims-description.patch` | **APPLIED 2026-04-30** | LOW | Adds `[INTERNAL_CLAIM_ID.BIZRETHINK]: ''` to the typed `internalClaimsDescription` map in `apps/remix/app/components/dialogs/organisation-create-dialog.tsx`. Required because overlay 001 added BIZRETHINK to the enum, and this map is typed as `{ [key in INTERNAL_CLAIM_ID]: ... }` so tsc requires every enum key. Empty description is fine — BIZRETHINK is never user-selectable in the billing UI. |
| 005 | `005-suppress-license-banner-self-host.patch` | **APPLIED 2026-04-30** | LOW | Replaces the body of `apps/remix/app/components/general/admin-license-status-banner.tsx` with `return null`. The licence server returns UNAUTHORIZED for our BIZRETHINK tier (overlay 001 has EE-flagged features), but self-host has no functional EE gate per the paywall audit. First attempt added `UNAUTHORIZED` to the early-return guard but broke `tsc` (downstream code referenced UNAUTHORIZED, type narrowed to "no overlap"); current version replaces the whole component with a stub. Caller at `root.tsx` still passes the `license` prop — kept the prop name + export shape, retyped to `unknown` to drop the upstream import. |
| 006 | `006-prune-upstream-only-workflows.patch` | **APPLIED 2026-04-30 (amended same day to add codeql-analysis.yml)** | MEDIUM | Deletes 13 GitHub Actions workflow files (Crowdin translations, DockerHub publish, Documenso community labelers, stale bot, tag-based deploy, advanced CodeQL config) + 1 orphaned labeler config. They have no purpose on a self-host fork and were generating failure-email noise on every push. The advanced CodeQL workflow specifically collided with the repo's default CodeQL setup ("CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled"); deleting the advanced workflow keeps the default setup as the active scanner. Adds a "Re-prune upstream-only workflow files" step to `upstream-sync.yml` so weekly merges that re-introduce these paths auto-delete them and commit before the sync PR opens. Conflicts case (modify/delete) intentionally left for human review. |
| 007 | `007-prisma-merge-additions.patch` | **APPLIED 2026-04-30** | LOW | Wires `packages/bizrethink/prisma-extensions/merge-into-schema.mjs` into `packages/prisma/package.json`'s build/prebuild/post-install/prisma:generate/prisma:migrate-* scripts. The merge script reads `additions.prisma` and appends its content into `schema.prisma` between marker comments (idempotent). Required prerequisite for Phase B (overlay 009 — per-org SMTP) and Phase C (overlay 010 — instance signing UI), which both add Prisma models. Patch surface is one new script key + six modified script prefixes. |
| 008 | `008-unblock-email-domains-self-host.patch` | **APPLIED 2026-04-30 (extended same day after full audit)** | LOW | Removes self-host paywall gates from THREE files: `o.$orgUrl.settings.email-domains._index.tsx` and `.$id.tsx` (both early-returned blank when billing disabled), and `o.$orgUrl.settings._layout.tsx` (which hid the Email Domains and Authentication Portal nav links via `!isBillingEnabled || !flag` gates that always evaluated to "hide" on self-host). On self-host, billing is always disabled but the BIZRETHINK claim has `emailDomains` + `authenticationPortal` both true — the gates should be claim-flag-only. Audit found 13 total IS_BILLING_ENABLED references; the other 10 correctly handle self-host (skip billing-required steps, hide billing-only UI, or never trigger). Drops the now-unused `IS_BILLING_ENABLED` import from the email-domain route files; `_layout.tsx` keeps it because the `/billing` nav gate is still correct. |

> **Note on the original `001-default-claim-enterprise.patch`:** That patch was written against an older shape of `create-organisation.ts` (had a default-fallback). By the time of the day-1 spike, upstream had refactored to require `claim` as a parameter at every call site, breaking that single-line strategy. The patch was deleted and replaced by 001+002 above. See `~/.claude/projects/-Users-shwet-github-bizrethink-internal-bizrethink-documenso/memory/documenso_paywall_audit.md` for the staleness note.

## Production deploy step (one-shot)

After applying 001+002 to a fresh deployment, also run the BIZRETHINK `SubscriptionClaim` INSERT documented in `packages/bizrethink/README.md`. Org creation works without it (no FK constraint), but admin UIs that list tiers won't see BIZRETHINK until the row exists.

## Pending evaluation (queued, not yet patched)

These ideas come from the day-1 spike or feature backlog. Convert to patches as needed.

| Idea | Trigger | Likely complexity |
|---|---|---|
| Override default mailer with Postmark adapter | Day 4–7 BizRethink features | Low — single import swap, possibly via env var |
| Skip deploying `apps/openpage-api` | Day 1 spike if it complicates Docker build | Trivial — docker-compose change |
| Custom theme injection per team | Day 4–7 BizRethink features | Medium — depends on Documenso's theme architecture |
| Add HIPAA / allowLegacyEnvelopes flags to BIZRETHINK tier | If we expand to healthcare or need legacy envelopes | Trivial — two lines in the 001 patch body |

## Convention reminder

Every patch in this directory must:

1. Have a one-paragraph header at the top:
   ```
   # Why: <rationale>
   # Why-not-additive: <why this can't be a new file in packages/bizrethink/>
   # Upstream-merge-fragility: low | medium | high
   ```
2. Be referenced in this README's "Active patches" table
3. Touch as few lines as possible
4. Be applied via `scripts/apply-overlays.sh` (TBD — for now, manually with `git apply`)

If you're tempted to add a multi-hundred-line patch, **stop and ask whether the change can live in `packages/bizrethink/` instead**. Big patches are a smell.
