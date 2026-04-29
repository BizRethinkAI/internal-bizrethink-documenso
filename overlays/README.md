# overlays/ — targeted patches to upstream files

This directory contains patches applied on top of upstream Documenso files. **Every patch must have a header explaining intent + fragility estimate.** See `UPSTREAM.md` for conventions.

## Active patches

| # | Patch | Status | Fragility | Why we need it |
|---|---|---|---|---|
| 001 | `001-default-claim-enterprise.patch` | **READY** (not yet applied — pending day 1 spike) | LOW | Make new orgs default to ENTERPRISE claim (all 13 feature flags on) instead of FREE. Single-line change at `packages/lib/server-only/organisation/create-organisation.ts:172`. Audit confirms this is the cleanest unlock for self-host. |

## Pending evaluation (queued, not yet patched)

These ideas come from the day-1 spike or feature backlog. Convert to patches as needed.

| Idea | Trigger | Likely complexity |
|---|---|---|
| Override default mailer with Postmark adapter | Day 4–7 BizRethink features | Low — single import swap, possibly via env var |
| Skip deploying `apps/openpage-api` | Day 1 spike if it complicates Docker build | Trivial — docker-compose change |
| Custom theme injection per team | Day 4–7 BizRethink features | Medium — depends on Documenso's theme architecture |
| Add `BIZRETHINK` claim tier with HIPAA + all flags | If we want HIPAA compliance later | Low — extend `internalClaims` map |

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
