import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link, useRouteContext } from "@tanstack/react-router";
import { relatedPostsQuery } from "@/features/posts/queries";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { m } from "@/paraglide/messages";

/**
 * "Related reading" list, ported from Mizuki's RelatedPosts widget.
 * Data comes from the /posts/related oRPC endpoint (scored
 * server-side, KV-cached for 24h). Visibility and count follow
 * site.features in the admin settings. Sidebar variant renders a
 * narrow card for the left column on post pages; footer variant
 * (kept for compatibility) is the wide bottom card.
 */
export function RelatedPosts({
  slug,
  variant = "sidebar",
}: {
  slug: string;
  variant?: "sidebar" | "footer";
}) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const enabled = siteConfig.features?.relatedPosts ?? true;
  const limit = siteConfig.features?.relatedPostsLimit ?? 5;
  const { data: related } = useSuspenseQuery(
    relatedPostsQuery(slug, limit),
  );

  if (!enabled || related.length === 0) return null;

  if (variant === "sidebar") {
    return (
      <div className="fuwari-card-base pb-4">
        <div className="font-bold text-lg fuwari-text-90 relative ml-6 mt-4 mb-2">
          <span
            className="absolute -left-4 top-[5.5px] w-1 h-4 rounded-md"
            style={{ backgroundColor: "var(--fuwari-primary)" }}
          />
          {m.posts_related_reading()}
        </div>
        <ul className="px-4 flex flex-col">
          {related.map((post) => (
            <li key={post.slug}>
              <Link
                to="/post/$slug"
                params={{ slug: post.slug }}
                className="group flex items-center w-full min-h-10 rounded-lg px-2 hover:px-3 hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) transition-all"
              >
                {post.cover ? (
                  <img
                    src={getPublicImageSrc(
                      post.cover,
                      PUBLIC_IMAGE_WIDTH.cover,
                    )}
                    alt=""
                    loading="lazy"
                    className="h-8 w-11 shrink-0 rounded-md object-cover"
                  />
                ) : null}
                <span className="ml-2 line-clamp-2 text-sm text-neutral-700 group-hover:text-(--fuwari-primary) dark:text-neutral-300 dark:group-hover:text-(--fuwari-primary) transition-colors min-w-0">
                  {post.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section className="fuwari-card-base p-6 md:p-8 mb-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <ArrowRight size={18} className="text-(--fuwari-primary)" />
        {m.posts_related_reading()}
      </h2>
      <ul className="flex flex-col divide-y divide-dashed divide-black/10 dark:divide-white/15">
        {related.map((post) => (
          <li key={post.slug}>
            <Link
              to="/post/$slug"
              params={{ slug: post.slug }}
              className="flex items-center gap-4 py-3 group"
            >
              {post.cover ? (
                <img
                  src={getPublicImageSrc(post.cover, PUBLIC_IMAGE_WIDTH.cover)}
                  alt=""
                  loading="lazy"
                  className="w-16 h-12 rounded-lg object-cover shrink-0"
                />
              ) : null}
              <span className="text-sm font-medium truncate group-hover:text-(--fuwari-primary) transition-colors">
                {post.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
