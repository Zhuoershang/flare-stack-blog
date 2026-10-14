import { describe, expect, it } from "vitest";
import {
  canonicalizeNavHref,
  isExternalNavHref,
  isNavHref,
  NAV_CHILDREN_MAX,
  normalizeNavLinks,
} from "./nav-links";

describe("nav href", () => {
  it("treats http(s) as external and root paths as internal", () => {
    expect(isExternalNavHref("https://github.com/du2333")).toBe(true);
    expect(isExternalNavHref("/post/about")).toBe(false);
    expect(isNavHref("/post/about")).toBe(true);
    expect(isNavHref("//evil.example")).toBe(false);
    expect(isNavHref("javascript:alert(1)")).toBe(false);
  });

  it("fills https for host-like addresses", () => {
    expect(canonicalizeNavHref("github.com/du2333")).toBe(
      "https://github.com/du2333",
    );
    expect(canonicalizeNavHref("/post/about")).toBe("/post/about");
    expect(canonicalizeNavHref("about")).toBe("about");
  });

  it("normalizes stored nav links", () => {
    expect(
      normalizeNavLinks([
        { label: "  About ", href: " /post/about " },
        { label: "GitHub", href: "github.com/du2333" },
        { label: "Nope", href: "ftp://example.com" },
      ]),
    ).toEqual([
      { label: "About", href: "/post/about" },
      { label: "GitHub", href: "https://github.com/du2333" },
    ]);
  });
});

describe("nested nav links", () => {
  it("keeps children and normalizes them recursively", () => {
    expect(
      normalizeNavLinks([
        {
          label: "Posts",
          href: "/posts",
          children: [
            { label: "Tech", href: " /posts?tagName=Tech " },
            { label: "Life", href: "life.example.com" },
            { label: "", href: "/ignored" },
          ],
        },
      ]),
    ).toEqual([
      {
        label: "Posts",
        href: "/posts",
        children: [
          { label: "Tech", href: "/posts?tagName=Tech" },
          { label: "Life", href: "https://life.example.com" },
        ],
      },
    ]);
  });

  it("allows a parent without href when it groups children", () => {
    expect(
      normalizeNavLinks([
        { label: "Group", href: "", children: [{ label: "A", href: "/a" }] },
      ]),
    ).toEqual([
      { label: "Group", href: "", children: [{ label: "A", href: "/a" }] },
    ]);
  });

  it("drops a childless parent that has no href", () => {
    expect(normalizeNavLinks([{ label: "Empty", href: "" }])).toEqual([]);
  });

  it("caps children count", () => {
    const many = Array.from({ length: NAV_CHILDREN_MAX + 5 }, (_, index) => ({
      label: `c${index}`,
      href: `/c${index}`,
    }));
    const normalized = normalizeNavLinks([
      { label: "Parent", href: "/p", children: many },
    ]);
    expect(normalized[0]?.children).toHaveLength(NAV_CHILDREN_MAX);
  });
});
