import { describe, expect, it } from "vitest";
import {
  canonicalizeNavHref,
  isExternalNavHref,
  isNavHref,
  NAV_LINKS_MAX,
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

  it("keeps legacy flat links byte-identical (no children key)", () => {
    expect(
      normalizeNavLinks([{ label: "Docs", href: "/docs" }]),
    ).toStrictEqual([{ label: "Docs", href: "/docs" }]);
  });

  it("normalizes nested children recursively", () => {
    expect(
      normalizeNavLinks([
        {
          label: " Resources ",
          href: "/resources",
          children: [
            { label: "  GitHub ", href: " github.com/du2333 " },
            { label: "Bad", href: "javascript:alert(1)" },
            { label: "Docs", href: "/docs" },
          ],
        },
      ]),
    ).toEqual([
      {
        label: "Resources",
        href: "/resources",
        children: [
          { label: "GitHub", href: "https://github.com/du2333" },
          { label: "Docs", href: "/docs" },
        ],
      },
    ]);
  });

  it("drops empty children arrays", () => {
    expect(
      normalizeNavLinks([
        { label: "Docs", href: "/docs", children: [] },
        { label: "More", href: "/more", children: [{ label: "", href: "/x" }] },
      ]),
    ).toStrictEqual([
      { label: "Docs", href: "/docs" },
      { label: "More", href: "/more" },
    ]);
  });

  it("caps top-level links at NAV_LINKS_MAX", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      label: `Link ${i}`,
      href: `/link-${i}`,
    }));
    const normalized = normalizeNavLinks(many);
    expect(normalized).toHaveLength(NAV_LINKS_MAX);
    expect(normalized[NAV_LINKS_MAX - 1]).toEqual({
      label: "Link 7",
      href: "/link-7",
    });
  });

  it("caps children per parent at NAV_LINKS_MAX", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      label: `Child ${i}`,
      href: `/child-${i}`,
    }));
    const normalized = normalizeNavLinks([
      { label: "Parent", href: "/parent", children: many },
    ]);
    expect(normalized[0].children).toHaveLength(8);
    expect(normalized[0].children?.[7]).toEqual({
      label: "Child 7",
      href: "/child-7",
    });
  });

  it("rejects third-level nesting", () => {
    expect(
      normalizeNavLinks([
        {
          label: "Parent",
          href: "/parent",
          children: [
            {
              label: "Child",
              href: "/child",
              children: [{ label: "Grandchild", href: "/grandchild" }],
            },
          ],
        },
      ]),
    ).toStrictEqual([
      {
        label: "Parent",
        href: "/parent",
        children: [{ label: "Child", href: "/child" }],
      },
    ]);
  });

  it("requires a valid parent link even when children exist", () => {
    expect(
      normalizeNavLinks([
        {
          label: "Broken",
          href: "javascript:alert(1)",
          children: [{ label: "Docs", href: "/docs" }],
        },
      ]),
    ).toStrictEqual([]);
  });
});
