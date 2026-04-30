# overlays/ — targeted patches to upstream files

This directory contains patches applied on top of upstream Documenso files. **Every patch must have a header explaining intent + fragility estimate.** See `UPSTREAM.md` for conventions.

## Active patches

| # | Patch | Status | Fragility | Why we need it |
|---|---|---|---|---|
| 001 | `001-add-bizrethink-claim-tier.patch` | **APPLIED 2026-04-29** | MEDIUM | Adds a 7th `BIZRETHINK` tier to `INTERNAL_CLAIM_ID` + `internalClaims` in `packages/lib/types/subscription.ts`. Mirrors ENTERPRISE flags; HIPAA + allowLegacyEnvelopes intentionally omitted. Pairs with overlay 002. |
| 002 | `002-route-org-creation-to-bizrethink-tier.patch` | **APPLIED 2026-04-29** | LOW | Repoints all three org-creation call sites (`createPersonalOrganisation`, `createOrganisationRoute`, `createAdminOrganisationRoute`) from `INTERNAL_CLAIM_ID.FREE` to `INTERNAL_CLAIM_ID.BIZRETHINK`. Single-token swaps; admin route also gains an import. |

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
