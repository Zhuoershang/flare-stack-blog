import { useEffect, useRef, useState } from "react";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";

const CAROUSEL_INTERVAL_MS = 6000;
const CROSSFADE_MS = 1200;

/**
 * Mizuki-style banner carousel (Apache-2.0, reimplemented in React).
 * Single image: plain <img>, unchanged behavior. Multiple images:
 * crossfade every 6s with a Ken Burns drift; paused while the tab is
 * hidden. All motion is CSS, no library.
 */
export function BannerCarousel({
  images,
  highPriority,
}: {
  images: string[];
  highPriority: boolean;
}) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (images.length < 2) return;
    const start = () => {
      if (timerRef.current !== null) return;
      timerRef.current = window.setInterval(() => {
        setIndex((value) => (value + 1) % images.length);
      }, CAROUSEL_INTERVAL_MS);
    };
    const stop = () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [images.length]);

  if (images.length < 2) {
    return (
      <img
        src={getPublicImageSrc(images[0] ?? "", PUBLIC_IMAGE_WIDTH.banner)}
        alt="banner"
        fetchPriority={highPriority ? "high" : "auto"}
        className="fuwari-banner-image w-full h-full object-cover object-center"
      />
    );
  }

  return (
    <div className="w-full h-full relative" aria-hidden="true">
      {images.map((image, i) => (
        <img
          key={`${image}-${i}`}
          src={getPublicImageSrc(image, PUBLIC_IMAGE_WIDTH.banner)}
          alt=""
          fetchPriority={i === 0 && highPriority ? "high" : "auto"}
          loading={i === 0 ? "eager" : "lazy"}
          className="fuwari-banner-frame absolute inset-0 w-full h-full object-cover object-center"
          style={{
            opacity: i === index ? 1 : 0,
            transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
            animation:
              i === index
                ? `fuwari-ken-burns ${CAROUSEL_INTERVAL_MS + CROSSFADE_MS}ms ease-out forwards`
                : undefined,
          }}
        />
      ))}
    </div>
  );
}
