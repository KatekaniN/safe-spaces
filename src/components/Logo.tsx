// Haven logo: shelter arch with a person kept inside
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        lineHeight: 1,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
      >
        {/* Arch / doorway */}
        <path
          d="M16 3C8.8 3 4 8.6 4 16v12a1 1 0 001 1h5a1 1 0 001-1v-9a5 5 0 0110 0v9a1 1 0 001 1h5a1 1 0 001-1V16c0-7.4-4.8-13-12-13z"
          fill="var(--brand)"
        />
        {/* Person inside */}
        <circle cx="16" cy="15.5" r="2.4" fill="var(--surface)" />
      </svg>
      <span
        className="display"
        style={{
          fontSize: size * 0.56,
          fontWeight: 700,
          color: "var(--text)",
          whiteSpace: "nowrap",
        }}
      >
        Safe Spaces
      </span>
    </span>
  );
}
