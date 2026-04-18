import logoUrl from "@/assets/prism-logo.png";

export function PrismLogo({ size = 280 }: { size?: number }) {
  return (
    <img
      src={logoUrl}
      alt="PRISM"
      width={size}
      height={size}
      className="select-none object-contain"
      style={{ width: size, height: size }}
    />
  );
}
