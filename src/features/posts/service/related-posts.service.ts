import { z } from "zod";
import * as postsData from "@/features/posts/data/posts.data";
import * as kvStore from "@/features/cache/kv-store";
import type { ApiContext } from "@/lib/orpc/context";
import type { PublicPostSnapshot } from "@/lib/db/schema/posts.table";

/**
 * Related-posts scoring ported from LyraVoid/Mizuki (Apache-2.0):
 * tag Jaccard with IDF weighting, title/summary token similarity,
 * same-category bonus and exponential freshness decay (180-day half-life).
 *
 * CPU cost control: results are cached in KV for 24h; a cache miss
 * scores at most RECENT_CANDIDATES recent posts once, then every
 * request for the same slug hits the cache with zero computation.
 */

const RECENT_CANDIDATES = 200;
const HALF_LIFE_DAYS = 180;

const WEIGHTS = {
  tag: 1.0,
  title: 0.6,
  summary: 0.4,
  category: 0.3,
  freshness: 0.2,
} as const;

const RelatedPostSchema = z.object({
  slug: z.string(),
  title: z.string(),
  cover: z.string().nullable(),
});
export type RelatedPost = z.infer<typeof RelatedPostSchema>;

type CandidateMeta = {
  slug: string;
  title: string;
  summary: string | null;
  tagIds: Array<number>;
  categoryId: number | null;
  publishedAt: number;
};

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length > 1),
  );
}

function tokenSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  return jaccard(tokenize(a), tokenize(b));
}

function freshnessScore(publishedAt: number, now: number): number {
  const days = Math.max(0, (now - publishedAt) / 86_400_000);
  return Math.exp((-Math.LN2 * days) / HALF_LIFE_DAYS);
}

function extractMeta(snapshot: PublicPostSnapshot): CandidateMeta {
  return {
    slug: snapshot.slug,
    title: snapshot.title,
    summary: snapshot.summary,
    tagIds: snapshot.tagIds,
    categoryId: snapshot.categoryId,
    publishedAt: Date.parse(snapshot.publishedAt),
  };
}

function scoreCandidates(
  current: CandidateMeta,
  candidates: CandidateMeta[],
  tagDocumentFrequency: Map<number, number>,
  totalPosts: number,
): Array<{ slug: string; score: number }> {
  const currentTags = new Set(current.tagIds);
  const now = Date.now();

  const tagIdf = new Map<number, number>();
  for (const tagId of currentTags) {
    const df = tagDocumentFrequency.get(tagId) ?? 0;
    tagIdf.set(tagId, Math.log(totalPosts / (1 + df)));
  }
  const currentTagWeight = [...currentTags].reduce(
    (sum, tagId) => sum + (tagIdf.get(tagId) ?? 0),
    0,
  );

  return candidates
    .filter((candidate) => candidate.slug !== current.slug)
    .map((candidate) => {
      let sharedIdf = 0;
      for (const tagId of candidate.tagIds) {
        if (currentTags.has(tagId)) sharedIdf += tagIdf.get(tagId) ?? 0;
      }
      const tagScore =
        currentTagWeight > 0 ? sharedIdf / currentTagWeight : 0;
      const titleScore = tokenSimilarity(current.title, candidate.title);
      const summaryScore = tokenSimilarity(
        current.summary ?? "",
        candidate.summary ?? "",
      );
      const categoryScore =
        candidate.categoryId !== null &&
        candidate.categoryId === current.categoryId
          ? 1
          : 0;
      const fresh = freshnessScore(candidate.publishedAt, now);

      const totalWeight =
        WEIGHTS.tag +
        WEIGHTS.title +
        WEIGHTS.summary +
        WEIGHTS.category +
        WEIGHTS.freshness;
      const score =
        (tagScore * WEIGHTS.tag +
          titleScore * WEIGHTS.title +
          summaryScore * WEIGHTS.summary +
          categoryScore * WEIGHTS.category +
          fresh * WEIGHTS.freshness) /
        totalWeight;
      return { slug: candidate.slug, score };
    })
    .sort((a, b) => b.score - a.score);
}

export async function getRelated(
  context: ApiContext,
  slug: string,
  limit: number,
): Promise<RelatedPost[]> {
  const cacheKey = ["posts", "related", slug, String(limit)];
  const cached = await kvStore.get(context, cacheKey);
  if (cached) {
    const parsed = RelatedPostSchema.array().safeParse(JSON.parse(cached));
    if (parsed.success) return parsed.data;
  }

  const rows = await postsData.findRecentPublished(
    context.db,
    RECENT_CANDIDATES,
  );
  if (rows.length === 0) return [];

  const metas = rows.map((row) => ({
    meta: extractMeta(row.snapshot),
    row,
  }));
  const current = metas.find((entry) => entry.meta.slug === slug);
  if (!current) return [];

  const tagDocumentFrequency = new Map<number, number>();
  for (const { meta } of metas) {
    for (const tagId of meta.tagIds) {
      tagDocumentFrequency.set(tagId, (tagDocumentFrequency.get(tagId) ?? 0) + 1);
    }
  }

  const scored = scoreCandidates(
    current.meta,
    metas.map(({ meta }) => meta),
    tagDocumentFrequency,
    metas.length,
  );
  const topSlugs = scored
    .filter(({ score }) => score > 0)
    .slice(0, limit)
    .map(({ slug: candidateSlug }) => candidateSlug);
  const fillSlugs = scored
    .filter(({ score }) => score <= 0)
    .slice(0, limit)
    .map(({ slug: candidateSlug }) => candidateSlug);
  const selectedSlugs = [...topSlugs, ...fillSlugs].slice(0, limit);
  if (selectedSlugs.length === 0) return [];

  const bySlug = new Map(metas.map(({ row }) => [row.snapshot.slug, row]));
  const related: RelatedPost[] = [];
  for (const candidateSlug of selectedSlugs) {
    const row = bySlug.get(candidateSlug);
    if (!row) continue;
    related.push({
      slug: row.snapshot.slug,
      title: row.snapshot.title,
      cover: row.snapshot.cover?.url ?? null,
    });
  }

  await kvStore.put(context, cacheKey, JSON.stringify(related), {
    ttl: "24h",
  });
  return related;
}
