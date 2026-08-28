import Image from "next/image";
import { PLACEHOLDER_IMAGE, publicImageUrl } from "@/features/catalog/image";

export function BlockImage({
  path,
  alt,
  className,
  priority,
}: {
  path?: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const src = path ? publicImageUrl(path) : PLACEHOLDER_IMAGE;
  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={800}
      priority={priority}
      sizes="(max-width: 768px) 100vw, 800px"
      className={className ?? "h-auto w-full rounded-lg object-cover"}
    />
  );
}
