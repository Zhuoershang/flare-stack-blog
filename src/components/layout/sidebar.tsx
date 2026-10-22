import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import {
  Categories,
  CategoriesSkeleton,
} from "@/features/categories/components/category-cloud";
import { RelatedPosts } from "@/features/posts/components/related-posts";
import { Tags, TagsSkeleton } from "@/features/tags/components/tag-cloud";
import { cn } from "@/lib/utils";
import { Profile } from "./profile";

export function Sidebar({ className }: { className?: string }) {
  // Related reading only renders on post pages (sidebar is shared layout).
  const params = useParams({ strict: false }) as { slug?: string };
  const slug = typeof params.slug === "string" ? params.slug : undefined;

  return (
    <aside className={cn("flex flex-col gap-4", className)}>
      <div
        className="fuwari-onload-animation"
        style={{ animationDelay: "100ms" }}
      >
        <Profile />
      </div>
      <div className="sticky top-4 flex flex-col gap-4">
        <div
          className="fuwari-onload-animation"
          style={{ animationDelay: "150ms" }}
        >
          <Suspense fallback={<CategoriesSkeleton />}>
            <Categories />
          </Suspense>
        </div>
        <div
          className="fuwari-onload-animation"
          style={{ animationDelay: "200ms" }}
        >
          <Suspense fallback={<TagsSkeleton />}>
            <Tags />
          </Suspense>
        </div>
        {slug ? (
          <div
            className="fuwari-onload-animation hidden lg:block"
            style={{ animationDelay: "250ms" }}
          >
            <Suspense fallback={null}>
              <RelatedPosts slug={slug} variant="sidebar" />
            </Suspense>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
