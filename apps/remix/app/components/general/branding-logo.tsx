import type { SVGAttributes } from 'react';

export type LogoProps = SVGAttributes<SVGSVGElement>;

// MODIFIED for BizRethink overlay 026: wordmark-led design.
// Heavy weight, tight tracking, signature accent period in warm gold.
// No symbol — the wordmark IS the brand. Period style follows the
// Stripe / Notion convention: a single colored mark that anchors the
// logo at any size.
//
// Wordmark uses currentColor so it inherits text color from parent
// (works on light + dark themes). Accent period is fixed gold so the
// brand color stays consistent across contexts.
//
// Period is placed via <circle> rather than tspan so its position is
// guaranteed regardless of which fallback font renders the wordmark.
// Tradeoff: if the wordmark renders narrower than expected on a system
// with no Inter-equivalent font, the period sits slightly further from
// the "a" — still readable, just not pixel-perfect.
export const BrandingLogo = ({ ...props }: LogoProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 96" {...props}>
      <text
        x="0"
        y="78"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
        fontWeight="900"
        fontSize="88"
        fill="currentColor"
        letterSpacing="-5"
      >
        pacta
      </text>
      {/* Signature accent period — warm gold (#d4a574). Hand-placed so it
          sits just right of the "a" regardless of font rendering. */}
      <circle cx="218" cy="82" r="8" fill="#d4a574" />
    </svg>
  );
};
