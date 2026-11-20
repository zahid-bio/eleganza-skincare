import type { CSSProperties } from "react";

export function isDirectImageSource(name: string): boolean {
  return (
    name.startsWith("/") ||
    name.startsWith("https://") ||
    name.startsWith("http://")
  );
}

export function productImageUrl(name: string): string {
  return isDirectImageSource(name) ? name : `/images/${name}.webp`;
}

export function Photo({
  name,
  alt,
  className,
  priority,
  style,
  sizes = "100vw",
}: {
  name: string;
  alt: string;
  className?: string;
  priority?: boolean;
  style?: CSSProperties;
  sizes?: string;
}) {
  const direct = isDirectImageSource(name);
  return (
    <picture className={className} style={style}>
      {!direct && (
        <source
          srcSet={`/images/${name}-small.webp 640w, /images/${name}.webp 1280w`}
          sizes={sizes}
        />
      )}
      <img
        src={direct ? name : `/images/${name}.webp`}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
      />
    </picture>
  );
}
