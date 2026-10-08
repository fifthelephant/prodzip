type SiteImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

/** Renders a configurable image. Local public paths and https URLs both work. */
export function SiteImage({ src, alt, className, priority = false }: SiteImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={(event) => {
        const image = event.currentTarget;
        if (image.dataset.fallbackApplied) return;
        image.dataset.fallbackApplied = "true";
        image.src = "/images/image-fallback.svg";
      }}
    />
  );
}
