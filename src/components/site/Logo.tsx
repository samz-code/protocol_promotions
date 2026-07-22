import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/logo.png";

export function Logo({ 
  className = "", 
  to = "/" 
}: { 
  className?: string; 
  to?: string; 
}) {
  return (
    <Link 
      to={to as any} 
      className={`inline-flex items-center ${className}`} 
      aria-label="Protocol Promotions — home"
    >
      <img
        src={logoAsset}
        alt="Protocol Promotions"
        width={220}
        height={60}
        className="h-11 md:h-12 w-auto"
      />
    </Link>
  );
}