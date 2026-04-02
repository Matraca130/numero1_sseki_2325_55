import { useState } from "react";
import { ImageOff, RefreshCw, Loader2 } from "lucide-react";

function getTransformedUrl(
  baseUrl: string,
  opts: { width: number; quality: number; format: "avif" | "webp" }
): string {
  return `${baseUrl}?width=${opts.width}&quality=${opts.quality}&format=${opts.format}`;
}

interface FlashcardImageProps {
  imageUrl: string | null;
  alt: string;
  loading?: "lazy" | "eager";
  size?: "thumb" | "full";
  className?: string;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function FlashcardImage({
  imageUrl, alt, loading = "lazy", size = "full",
  className = "", onRegenerate, isRegenerating = false,
}: FlashcardImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!imageUrl) {
    return onRegenerate ? (
      <button onClick={onRegenerate} disabled={isRegenerating}
        className="w-full h-40 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/50 flex flex-col items-center justify-center gap-2 hover:bg-teal-50 transition-colors cursor-pointer">
        {isRegenerating ? (
          <Loader2 size={24} className="text-teal-500 animate-spin" />
        ) : (
          <ImageOff size={24} className="text-teal-400" />
        )}
        <span className="text-sm text-teal-600 font-medium">
          {isRegenerating ? "Generando imagen..." : "Generar imagen con IA"}
        </span>
      </button>
    ) : null;
  }

  const width = size === "thumb" ? 200 : 800;
  const avifUrl = getTransformedUrl(imageUrl, { width, quality: size === "thumb" ? 60 : 80, format: "avif" });
  const webpUrl = getTransformedUrl(imageUrl, { width, quality: size === "thumb" ? 70 : 85, format: "webp" });

  if (hasError) {
    return (
      <div className="w-full h-40 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
        <ImageOff size={20} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {!isLoaded && <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-xl" />}
      <picture>
        <source srcSet={avifUrl} type="image/avif" />
        <source srcSet={webpUrl} type="image/webp" />
        <img src={webpUrl} alt={alt} loading={loading}
          onLoad={() => setIsLoaded(true)} onError={() => setHasError(true)}
          className={`w-full h-auto object-contain transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`} />
      </picture>
      {onRegenerate && (
        <button onClick={onRegenerate} disabled={isRegenerating}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-white transition-colors"
          title="Regenerar imagen">
          <RefreshCw size={14} className={`text-gray-600 ${isRegenerating ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
}
