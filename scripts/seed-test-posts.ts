/**
 * Seeds 10 test posts through the local dev server's admin API.
 *
 *   bun scripts/dev-admin-session.ts seed   # prints the cookie value
 *   bun scripts/seed-test-posts.ts <cookie> # creates categories/tags/posts
 *
 * Distribution is designed to exercise the related-posts scoring:
 * shared tags with different document frequencies, same-category vs
 * same-tag pairs, and fully unrelated control posts.
 */
const BASE = "http://localhost:3000";

const cookie = process.argv[2];
if (!cookie) {
  console.error("usage: bun scripts/seed-test-posts.ts <session-cookie>");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Cookie: `better-auth.session_token=${cookie}`,
};

const para = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function ensureCategory(name: string): Promise<number> {
  const list = await api("GET", "/api/categories");
  const hit = (list.items ?? list).find(
    (item: { name: string }) => item.name === name,
  );
  if (hit) return hit.id;
  const created = await api("POST", "/api/admin/categories", { name });
  return created.id ?? created.category?.id ?? created.categoryId;
}

async function ensureTag(name: string): Promise<number> {
  const list = await api("GET", "/api/tags");
  const hit = (list.items ?? list).find(
    (item: { name: string }) => item.name === name,
  );
  if (hit) return hit.id;
  const created = await api("POST", "/api/admin/tags", { name });
  return created.id ?? created.tag?.id ?? created.tagId;
}

async function createPost(input: {
  title: string;
  summary: string;
  body: string;
  categoryId: number | null;
  tagIds: number[];
  publishedAt: string;
}): Promise<number> {
  const created = await api("POST", "/api/admin/posts", {
    data: {
      title: input.title,
      summary: input.summary,
      contentJson: para(input.body),
    },
  });
  const id = created.id ?? created.postId;
  if (!id) throw new Error(`no id for ${input.title}: ${JSON.stringify(created)}`);

  await api("PATCH", `/api/admin/posts/${id}`, {
    id,
    data: { categoryId: input.categoryId },
  });
  if (input.tagIds.length > 0) {
    await api("PUT", `/api/admin/posts/${id}/tags`, {
      postId: id,
      tagIds: input.tagIds,
    });
  }
  await api("POST", `/api/admin/posts/${id}/publish`, { id });
  return id;
}

const posts = [
  {
    title: "云原生入门：容器基础",
    summary: "介绍容器技术的基本概念、_namespace 与 cgroup 隔离原理",
    category: "云原生",
    tags: ["Docker", "Kubernetes"],
    daysAgo: 90,
    body: "容器是云原生的基石。本文讲解镜像、层、namespace 与 cgroup 的基本原理，以及容器与虚拟机的区别。",
  },
  {
    title: "Docker 镜像构建最佳实践",
    summary: "多阶段构建、层缓存与瘦身技巧",
    category: "云原生",
    tags: ["Docker"],
    daysAgo: 60,
    body: "Dockerfile 的写法直接影响构建速度与镜像体积。本文总结多阶段构建、层缓存顺序、distroless 基础镜像等最佳实践。",
  },
  {
    title: "Kubernetes 部署实战指南",
    summary: "Deployment、Service 与 Ingress 的最小可用配置",
    category: "云原生",
    tags: ["Kubernetes"],
    daysAgo: 30,
    body: "从零开始在 Kubernetes 上部署一个 Web 服务：Deployment 副本管理、Service 暴露、Ingress 路由与健康检查。",
  },
  {
    title: "Docker 网络原理详解",
    summary: "bridge、host、overlay 三种网络模式",
    category: "网络技术",
    tags: ["Docker", "网络"],
    daysAgo: 20,
    body: "Docker 网络模式决定了容器间如何通信。本文深入 bridge 网桥、端口映射与 overlay 跨主机网络的实现。",
  },
  {
    title: "前端框架对比：React vs Vue",
    summary: "从响应式模型、生态与心智负担三个维度对比",
    category: "前端开发",
    tags: ["React", "Vue"],
    daysAgo: 15,
    body: "React 与 Vue 是最主流的两个前端框架。本文从响应式实现、组件模型、生态成熟度与学习曲线做一次系统对比。",
  },
  {
    title: "React Hooks 深入浅出",
    summary: "useState、useEffect 与闭包陷阱",
    category: "前端开发",
    tags: ["React", "TypeScript"],
    daysAgo: 10,
    body: "Hooks 改变了 React 的心智模型。本文拆解 useState 的更新调度、useEffect 的依赖比较，以及经典的闭包陷阱。",
  },
  {
    title: "TypeScript 类型体操练习",
    summary: "用 Conditional Types 与 mapped types 实现常见工具类型",
    category: "前端开发",
    tags: ["TypeScript"],
    daysAgo: 5,
    body: "类型体操是掌握 TypeScript 的必经之路。本文精选 Partial、Pick、ReturnType 等工具类型的手写实现。",
  },
  {
    title: "深度学习模型压缩综述",
    summary: "剪枝、量化与知识蒸馏",
    category: "人工智能",
    tags: ["AI"],
    daysAgo: 45,
    body: "模型压缩让大模型跑进边缘设备。本文综述剪枝、量化、知识蒸馏三条路线的原理与代表工作。",
  },
  {
    title: "家庭 NAS 选购与搭建",
    summary: "盘位、系统与内网穿透方案",
    category: "生活方式",
    tags: ["NAS", "硬件"],
    daysAgo: 8,
    body: "搭建家庭 NAS 需要考虑盘位、冗余、系统选型与远程访问。本文记录一次飞牛 OS 的搭建过程。",
  },
  {
    title: "一次说走就做的旅行记录",
    summary: "三天的短途徒步与美食记录",
    category: "生活方式",
    tags: ["旅行"],
    daysAgo: 0,
    body: "趁周末来了场说走就走的短途徒步。本文记录路线、装备清单和沿途吃到的好东西。",
  },
];

async function main() {
  const categoryIds = new Map<string, number>();
  for (const name of new Set(posts.map((p) => p.category))) {
    categoryIds.set(name, await ensureCategory(name));
  }
  const tagIds = new Map<string, number>();
  for (const name of new Set(posts.flatMap((p) => p.tags))) {
    tagIds.set(name, await ensureTag(name));
  }
  console.log(
    `categories: ${[...categoryIds].map(([k, v]) => `${k}=${v}`).join(", ")}`,
  );
  console.log(`tags: ${[...tagIds].map(([k, v]) => `${k}=${v}`).join(", ")}`);

  for (const post of posts) {
    const publishedAt = new Date(
      Date.now() - post.daysAgo * 86_400_000,
    ).toISOString();
    const id = await createPost({
      title: post.title,
      summary: post.summary,
      body: post.body,
      categoryId: categoryIds.get(post.category) ?? null,
      tagIds: post.tags.map((tag) => tagIds.get(tag)!).filter(Boolean),
      publishedAt,
    });
    console.log(`created #${id} ${post.title}`);
  }
  console.log("done: 10 posts seeded");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
