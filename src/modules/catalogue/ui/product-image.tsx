import Image from "next/image";

type MediaLike = { $id: string; altText?: unknown } | null | undefined;

export function ProductImage({ media, productName, className = "product-media" }: { media: MediaLike; productName: string; className?: string }) {
  if (!media) return <div className={`${className} product-media-fallback`}><span>{productName.slice(0, 2).toUpperCase()}</span></div>;
  return <div className={className}><Image src={`/api/catalogue/media/${media.$id}`} alt={String(media.altText || productName)} fill sizes="(max-width: 520px) 100vw, (max-width: 900px) 50vw, 25vw" /></div>;
}
