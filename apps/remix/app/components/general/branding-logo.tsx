import type { SVGAttributes } from 'react';

export type LogoProps = SVGAttributes<SVGSVGElement>;

// MODIFIED for BizRethink overlay 026: replace upstream Documenso wordmark
// with Pacta seal + wordmark horizontal lockup. Uses `currentColor` for all
// fills/strokes so it inherits text color from parent (matches upstream
// component behavior — `<BrandingLogo className="text-foreground h-6" />`).
//
// Seal symbol on the left, "pacta" wordmark on the right. Aspect ratio
// designed for ~4:1 horizontal display at heights from h-3 (12px) up to
// h-14 (56px). The viewBox 480×120 is the design grid; sized externally
// via className.
export const BrandingLogo = ({ ...props }: LogoProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 120" {...props}>
      {/* Seal — outer ring */}
      <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="4" />
      {/* Seal — inner ring (decorative) */}
      <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="1" />
      {/* Seal — cardinal dots */}
      <circle cx="60" cy="3" r="1.5" fill="currentColor" />
      <circle cx="60" cy="117" r="1.5" fill="currentColor" />
      <circle cx="3" cy="60" r="1.5" fill="currentColor" />
      <circle cx="117" cy="60" r="1.5" fill="currentColor" />
      {/* Geometric P inside seal */}
      <path
        d="M 42 30 L 42 90 L 52.5 90 L 52.5 63 L 67.5 63 A 16.5 16.5 0 0 0 67.5 30 L 42 30 Z M 52.5 38 L 67.5 38 A 8 8 0 0 1 67.5 54.5 L 52.5 54.5 Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      {/* Signature dot below the P */}
      <circle cx="60" cy="96" r="2" fill="currentColor" />
      {/* Wordmark "pacta" — geometric humanist sans, currentColor fill */}
      <text
        x="148"
        y="78"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, 'Helvetica Neue', sans-serif"
        fontWeight="600"
        fontSize="64"
        fill="currentColor"
        letterSpacing="-2"
      >
        pacta
      </text>
    </svg>
  );
};
