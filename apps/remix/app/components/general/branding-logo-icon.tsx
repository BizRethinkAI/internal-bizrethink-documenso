import type { SVGAttributes } from 'react';

export type LogoProps = SVGAttributes<SVGSVGElement>;

// MODIFIED for BizRethink overlay 026: replace upstream Documenso square
// icon with Pacta seal symbol. Square 1:1 viewBox (200×200) so it works
// equally as a favicon-style mark or app-tile icon. Uses `currentColor`
// throughout for theme inheritance.
//
// Used by upstream in the envelope-signer-header on small screens
// (`<BrandingLogoIcon className="h-6 w-auto md:hidden" />`).
export const BrandingLogoIcon = ({ ...props }: LogoProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" {...props}>
      {/* Outer ring */}
      <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="6" />
      {/* Inner ring (decorative double-line) */}
      <circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/* Cardinal dots */}
      <circle cx="100" cy="14" r="2" fill="currentColor" />
      <circle cx="100" cy="186" r="2" fill="currentColor" />
      <circle cx="14" cy="100" r="2" fill="currentColor" />
      <circle cx="186" cy="100" r="2" fill="currentColor" />
      {/* Geometric P with cutout */}
      <path
        d="M 70 50 L 70 150 L 88 150 L 88 105 L 113 105 A 27.5 27.5 0 0 0 113 50 L 70 50 Z M 88 64 L 113 64 A 13.5 13.5 0 0 1 113 91 L 88 91 Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      {/* Signature dot */}
      <circle cx="100" cy="160" r="3.5" fill="currentColor" />
    </svg>
  );
};
