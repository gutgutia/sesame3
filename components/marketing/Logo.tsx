import Image from "next/image";

interface LogoProps {
  variant?: "full" | "mark";
  size?: "sm" | "md" | "lg";
  darkMode?: boolean;
}

// Size mappings for the logo
const sizes = {
  sm: { height: 28, width: 124 },  // 248:56 aspect ratio
  md: { height: 36, width: 159 },
  lg: { height: 48, width: 212 },
};

// Mark-only sizes (square)
const markSizes = {
  sm: 28,
  md: 36,
  lg: 48,
};

export function Logo({ variant = "full", size = "md", darkMode = false }: LogoProps) {
  if (variant === "mark") {
    const markSize = markSizes[size];
    return (
      <Image
        src="/brand/sesame3-primary.png"
        alt="Sesame3"
        width={markSize}
        height={markSize}
        style={{ objectFit: "contain", objectPosition: "left" }}
        className="flex-shrink-0"
      />
    );
  }

  const { height, width } = sizes[size];
  const src = darkMode ? "/brand/sesame3-white.png" : "/brand/sesame3-primary.png";

  return (
    <Image
      src={src}
      alt="Sesame3"
      width={width}
      height={height}
      className="flex-shrink-0"
      priority
    />
  );
}

// Standalone minimal mark for use in other components
export function LogoMinimal({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="56" height="56" rx="12" fill="var(--accent-primary)" />
      <g transform="translate(3, 0)">
        <path fillRule="evenodd" clipRule="evenodd" d="M17.4097 45.3592L11.2856 39.3408L11.3229 39.3408L20.9198 29.9095L26.6705 35.561C28.4007 37.09 32.8021 39.3261 36.5662 36.038C37.9105 34.9004 39.9942 31.7004 37.5744 28.0012L32.6079 23.1205L35.0725 20.6984L39.7402 25.2489C41.4455 27.3896 43.8329 32.8894 39.7402 37.7628L32.6079 44.772C30.2305 47.0718 23.8624 50.4088 17.4097 45.3592ZM29.5832 42.9372L31.4876 41.0656C28.082 40.772 25.1644 38.7414 24.1312 37.7628L20.8451 34.5334L15.916 39.3775L19.7622 42.9372C23.8549 45.9611 28.0148 44.1971 29.5832 42.9372Z" fill="white"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M32.5903 10.6408L38.7144 16.6592H38.6771L29.0802 26.0905L23.3295 20.439C21.5993 18.91 17.1979 16.6739 13.4338 19.962C12.0895 21.0996 10.0058 24.2996 12.4256 27.9988L17.3921 32.8795L14.9275 35.3016L10.2598 30.7511C8.5545 28.6104 6.1671 23.1106 10.2598 18.2372L17.3921 11.228C19.7695 8.92822 26.1376 5.59117 32.5903 10.6408ZM20.4168 13.0628L18.5124 14.9344C21.918 15.228 24.8356 17.2586 25.8688 18.2372L29.1549 21.4666L34.084 16.6225L30.2378 13.0628C26.1451 10.0389 21.9852 11.8029 20.4168 13.0628Z" fill="white"/>
      </g>
    </svg>
  );
}

// Legacy export for backwards compatibility
export function LogoDoorway({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="44" height="44" rx="12" fill="var(--accent-primary)" />
      <path
        d="M16 38V18C16 13.5817 19.5817 10 24 10C28.4183 10 32 13.5817 32 18V38"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M24 20L24 30" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M20 24L28 24" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
