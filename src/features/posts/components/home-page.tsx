import type { PostItem } from "@/features/posts/schema/posts.schema";
import { useRouteContext } from "@tanstack/react-router";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { HomePagination } from "./home-pagination";
import { PostCard } from "./post-card";

export const POPULAR_POSTS_LIMIT = 3;

interface HomePageProps {
  posts: Array<PostItem>;
  popularPosts?: Array<PostItem>;
  page: number;
  totalPages: number;
}

export function HomePage({
  posts,
  popularPosts,
  page,
  totalPages,
}: HomePageProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const scrollReveal = siteConfig.features?.scrollReveal ?? true;
  useScrollReveal([page, scrollReveal]);
  const popularSlugs = new Set((popularPosts ?? []).map((post) => post.slug));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col rounded-(--fuwari-radius-large) bg-(--fuwari-card-bg) py-1 md:py-0 md:bg-transparent md:gap-4">
        {posts.map((post, i) => (
          <div
            key={post.slug}
            className={scrollReveal ? "mizuki-on-scroll" : undefined}
            data-mizuki-reveal={scrollReveal ? true : undefined}
          >
            <PostCard
              post={post}
              pinned={Boolean(post.pinnedAt)}
              popular={!post.pinnedAt && popularSlugs.has(post.slug)}
            />
            {i < posts.length - 1 && (
              <div className="border-t border-dashed mx-6 border-black/10 dark:border-white/15 md:hidden" />
            )}
          </div>
        ))}
      </div>
      <HomePagination page={page} totalPages={totalPages} />
    </div>
  );
}
