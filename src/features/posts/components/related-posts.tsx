import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { relatedPostsQuery } from "@/features/posts/queries";
import { getPublicImageSrc, PUBLIC_IMAGE_WIDTH } from "@/features/media/utils/media.utils";
/**
 * "Related reading" card row at the bottom of a post, ported from
 * Mizuki's RelatedPosts widget. Data comes from the /posts/related
 * oRPC endpoint (scored server-side, KV-cached for 24h).
 */
export function RelatedPosts({ slug }: { slug: string }) {
  const { data: related } = useSuspenseQuery(
    relatedPostsQuery(slug, 5),
  );

  if (related.length === 0) return null;

  return (
    <section className="fuwari-card-base p-6 md:p-8 mb-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <ArrowRight size={18} className="text-(--fuwari-primary)" />
        相关阅读
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
