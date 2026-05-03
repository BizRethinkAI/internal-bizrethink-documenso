import type { SVGAttributes } from 'react';

export type LogoProps = SVGAttributes<SVGSVGElement>;

// MODIFIED for BizRethink overlay 026: square symbol matching the
// wordmark identity. Just a heavy lowercase "p" with the signature gold
// accent dot — no seal motif. Hand-crafted as paths so it renders
// identically at every size including 16×16 favicon.
//
// Used by upstream in the envelope-signer-header on small screens
// (<BrandingLogoIcon className="h-6 w-auto md:hidden" />).
export const BrandingLogoIcon = ({ ...props }: LogoProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" {...props}>
      {/* Heavy lowercase "p" — stem on left, bowl extending right, descender
          below baseline. Inner bowl cutout via fill-rule="evenodd". */}
      <path
        d="M 50 35 L 80 35 A 35 35 0 0 1 80 105 L 80 165 L 50 165 Z M 80 50 A 18 18 0 0 1 80 90 Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      {/* Signature gold accent dot, matching the wordmark's period. */}
      <circle cx="135" cy="100" r="11" fill="#d4a574" />
    </svg>
  );
};
