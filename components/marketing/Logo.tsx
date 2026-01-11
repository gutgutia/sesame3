interface LogoProps {
  variant?: "full" | "mark";
  size?: "sm" | "md" | "lg";
  darkMode?: boolean;
}

// Logo mark SVG - separated to avoid creating components during render
function LogoMarkSvg({ markSize, fontSize }: { markSize: number; fontSize: number }) {
  return (
    <svg
      width={markSize}
      height={markSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <rect x="2" y="2" width="44" height="44" rx="12" fill="var(--accent-primary)" />
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fill="white"
        fontSize={fontSize * (48 / markSize)}
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        S3
      </text>
    </svg>
  );
}

export function Logo({ variant = "full", size = "md", darkMode = false }: LogoProps) {
  const sizes = {
    sm: { mark: 24, text: "text-lg", fontSize: 11 },
    md: { mark: 32, text: "text-2xl", fontSize: 14 },
    lg: { mark: 48, text: "text-4xl", fontSize: 22 },
  };

  const { mark: markSize, text: textSize, fontSize } = sizes[size];
  const textColor = darkMode ? "text-white" : "text-[var(--text-main)]";

  if (variant === "mark") {
    return <LogoMarkSvg markSize={markSize} fontSize={fontSize} />;
  }

  return (
    <div className="flex items-center gap-1.5">
      <LogoMarkSvg markSize={markSize} fontSize={fontSize} />
      <span className={`font-['Inter'] font-bold ${textSize} ${textColor}`}>
        Sesame3
      </span>
    </div>
  );
}

// Standalone minimal mark for use in other components
export function LogoMinimal({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="44" height="44" rx="12" fill="var(--accent-primary)" />
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fill="white"
        fontSize="22"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        S3
      </text>
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
