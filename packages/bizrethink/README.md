# @bizrethink/customizations

All BizRethink-specific code lives here. Treat this package as if it were a regular Documenso workspace package — same import conventions, same TypeScript settings, same Prisma access pattern.

## Layout

```
packages/bizrethink/
├── server-only/             ← server-side logic
│   ├── tenant-routing.ts        (TODO day 4) per-tenant routing for outbound contracts
│   ├── postmark-mailer.ts       (TODO day 4) override Documenso's default mailer
│   ├── webhook-fan-out.ts       (TODO day 5) bridge Documenso webhooks → BizRethink event bus
│   └── fintech-audit-hooks.ts   (TODO day 6) extra audit events for SOC 2 posture
├── ui/                      ← React/CSS additions
│   ├── tenant-themes/           (TODO day 7) per-DBA Tailwind themes
│   └── BizRethinkSigningOverlay.tsx (TODO day 7) per-tenant signing-page customization
├── prisma-extensions/       ← schema additions (NEVER modify upstream packages/prisma/schema.prisma)
│   └── additions.prisma         (TODO day 5) BizRethink-specific tables (e.g., legal_entity routing audit)
├── feature-flags.ts         ← single switchboard for "enable in our build"
├── package.json             ← workspace package definition
└── README.md                ← this file
```

## How to add a feature

1. Decide if it can live ENTIRELY in this package. If yes, just add files. No upstream files touched.
2. If you need to wire it into upstream code (e.g., inject your mailer in place of the default), write the wiring as a small overlay patch in `overlays/`. The patch should typically be 1–3 lines long.
3. Update `feature-flags.ts` if the feature needs runtime toggling.
4. Update this README's "Layout" section.

## Anti-patterns to avoid

- ❌ Forking a large upstream file to "tweak" it. Either write a new file in this package + an overlay to use it, OR contribute the change upstream so it benefits everyone.
- ❌ Modifying `packages/prisma/schema.prisma` directly. Always go through `prisma-extensions/`.
- ❌ Adding a top-level dependency for a feature only used in this package. Add deps to this package's own `package.json`.
- ❌ Reaching into upstream's private internals via deep imports. If something isn't exported, that's intentional — file an upstream issue or work around it.

## Why this discipline matters

Solo dev. Weekly upstream sync. Every modification of an upstream file is a future merge conflict. Every additive file in this package costs zero merge debt. Trade aggressively in favor of additive.
