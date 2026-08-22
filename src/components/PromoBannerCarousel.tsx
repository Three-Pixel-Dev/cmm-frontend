import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ApiBanner } from "@/lib/api/markets";
import { usePromoBanners } from "@/hooks/useBanners";
import { cn } from "@/lib/utils";

const AUTOPLAY_DELAY = 5000; // ms between auto-advances

function PromoBannerSlide({ banner }: { banner: ApiBanner }) {
  const navigate = useNavigate();

  function handleClick() {
    if (!banner.link_url) return;
    if (banner.link_type === "messenger") {
      window.open(banner.link_url, "_blank", "noopener,noreferrer");
    } else {
      // In-app link — strip leading https://domain to get the pathname if needed
      try {
        const url = new URL(banner.link_url);
        // Navigate internally using the path portion
        void navigate({ to: url.pathname + url.search + url.hash });
      } catch {
        // Relative path — navigate directly
        void navigate({ to: banner.link_url as "/" });
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative block w-full overflow-hidden rounded-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        banner.link_url ? "cursor-pointer" : "cursor-default",
      )}
      aria-label={`Promotional banner — click to learn more`}
    >
      <img
        src={banner.image_url}
        alt="Promotional banner"
        className="h-full w-full object-cover"
        draggable={false}
      />
      {/* Subtle overlay on hover */}
      {banner.link_url && (
        <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
      )}
    </button>
  );
}

export function PromoBannerCarousel() {
  const { data: banners = [] } = usePromoBanners();
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (index: number) => {
      setCurrent(((index % banners.length) + banners.length) % banners.length);
    },
    [banners.length],
  );

  const startAutoplay = useCallback(() => {
    if (banners.length <= 1) return;
    timerRef.current = setTimeout(() => {
      setCurrent((c) => (c + 1) % banners.length);
    }, AUTOPLAY_DELAY);
  }, [banners.length]);

  // Reset timer whenever slide changes
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startAutoplay();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, startAutoplay]);

  // Clamp index after banners list changes
  useEffect(() => {
    if (banners.length > 0 && current >= banners.length) setCurrent(0);
  }, [banners.length, current]);

  if (banners.length === 0) return null;

  const activeBanner = banners[current]!;

  return (
    <section
      className="relative w-full overflow-hidden rounded-xl"
      aria-label="Promotional banners"
      aria-roledescription="carousel"
    >
      {/* Aspect ratio container — 2.5:1 for wide banner, responsive */}
      <div className="aspect-[2.5/1] min-h-[120px] max-h-[360px] w-full bg-muted">
        <PromoBannerSlide banner={activeBanner} />
      </div>

      {/* Dot indicators — only when more than one banner */}
      {banners.length > 1 && (
        <div
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5"
          role="tablist"
          aria-label="Slide indicators"
        >
          {banners.map((b, i) => (
            <button
              key={b.id}
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                "rounded-full transition-all duration-300",
                i === current
                  ? "h-2 w-6 bg-white shadow-sm"
                  : "h-2 w-2 bg-white/50 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      )}

      {/* Previous / Next buttons — only when more than one banner */}
      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Previous banner"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Next banner"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </section>
  );
}
