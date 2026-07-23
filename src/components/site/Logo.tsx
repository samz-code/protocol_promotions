import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/logo.png";

/**
 * Brand mark.
 *
 * Sizing is overridable: pass `imgClassName` to change the height at any
 * breakpoint. The default steps down on small screens so the mark never
 * crowds the header icons on a narrow phone.
 *
 * Pass `asLink={false}` when this sits inside something that is already a
 * link or a button, since nesting anchors is invalid HTML and breaks
 * keyboard navigation.
 */
export function Logo({
  className = "",
  imgClassName = "",
  to = "/",
  asLink = true,
  priority = false,
}: {
  className?: string;
  imgClassName?: string;
  to?: string;
  asLink?: boolean;
  priority?: boolean;
}) {
  const img = (
    <img
      src={logoAsset}
      alt="Protocol Promotions"
      width={220}
      height={60}
      /* Intrinsic ratio reserves the right box before the file loads, so the
         header does not jump. */
      style={{ aspectRatio: "220 / 60" }}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`w-auto max-w-full object-contain ${
        imgClassName || "h-8 sm:h-9 md:h-11 lg:h-12"
      }`}
    />
  );

  if (!asLink) {
    return <span className={`inline-flex min-w-0 items-center ${className}`}>{img}</span>;
  }

  return (
    <Link
      to={to as never}
      className={`inline-flex min-w-0 items-center ${className}`}
      aria-label="Protocol Promotions, home"
    >
      {img}
    </Link>
  );
}