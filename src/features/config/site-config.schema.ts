import { z } from "zod";
import type { Messages } from "@/lib/i18n";
import {
  canonicalizeNavHref,
  isNavHref,
  NAV_LINK_CHILDREN_MAX,
  NAV_LINK_LABEL_MAX,
  NAV_LINKS_MAX,
} from "./utils/nav-links";
import { SOCIAL_PLATFORM_KEYS } from "./utils/social-platforms";

const SocialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORM_KEYS),
  url: z.string(),
  icon: z.string().optional(),
  label: z.string().optional(),
});

export const FUWARI_THEME_HUE_MIN = 0;
export const FUWARI_THEME_HUE_MAX = 360;

function createSiteTextSchema(max: number) {
  return z.string().trim().max(max);
}

const NavLinkSchema: z.ZodType<{
  label: string;
  href: string;
  children?: Array<{
    label: string;
    href: string;
  }>;
}> = z.object({
  label: createSiteTextSchema(NAV_LINK_LABEL_MAX).pipe(z.string().min(1)),
  href: z.string().trim().refine(isNavHref, {
    message: "Please enter a root-relative path or http(s) URL",
  }),
  children: z
    .array(
      z.object({
        label: createSiteTextSchema(NAV_LINK_LABEL_MAX).pipe(
          z.string().min(1),
        ),
        href: z.string().trim().refine(isNavHref, {
          message: "Please enter a root-relative path or http(s) URL",
        }),
      }),
    )
    .max(NAV_LINK_CHILDREN_MAX)
    .optional(),
});

function createNavLinksFormSchema(messages: Messages) {
  return z
    .array(
      z.object({
        label: z.string(),
        href: z.string(),
        children: z
          .array(
            z.object({
              label: z.string(),
              href: z.string(),
            }),
          )
          .max(NAV_LINK_CHILDREN_MAX)
          .optional(),
      }),
    )
    .max(NAV_LINKS_MAX)
    .transform((links) =>
      links.map((link) => ({
        label: link.label.trim(),
        href: canonicalizeNavHref(link.href),
        ...(link.children && link.children.length > 0
          ? {
              children: link.children.map((child) => ({
                label: child.label.trim(),
                href: canonicalizeNavHref(child.href),
              })),
            }
          : {}),
      })),
    )
    .superRefine((links, ctx) => {
      links.forEach((link, index) => {
        const hasChildren = Boolean(link.children && link.children.length > 0);
        if (!link.label && !link.href && !hasChildren) return;
        if (!link.label) {
          ctx.addIssue({
            code: "custom",
            message: messages.settings_site_validation_nav_label_required(),
            path: [index, "label"],
          });
        } else if (link.label.length > NAV_LINK_LABEL_MAX) {
          ctx.addIssue({
            code: "custom",
            message: messages.settings_site_validation_too_long({
              max: NAV_LINK_LABEL_MAX,
            }),
            path: [index, "label"],
          });
        }
        if (!link.href) {
          ctx.addIssue({
            code: "custom",
            message: messages.settings_site_validation_nav_href_required(),
            path: [index, "href"],
          });
        } else if (!isNavHref(link.href)) {
          ctx.addIssue({
            code: "custom",
            message: messages.settings_site_validation_invalid_nav_href(),
            path: [index, "href"],
          });
        }
        link.children?.forEach((child, childIndex) => {
          const path = [index, "children", childIndex] as const;
          if (!child.label && !child.href) return;
          if (!child.label) {
            ctx.addIssue({
              code: "custom",
              message: messages.settings_site_validation_nav_label_required(),
              path: [...path, "label"],
            });
          } else if (child.label.length > NAV_LINK_LABEL_MAX) {
            ctx.addIssue({
              code: "custom",
              message: messages.settings_site_validation_too_long({
                max: NAV_LINK_LABEL_MAX,
              }),
              path: [...path, "label"],
            });
          }
          if (!child.href) {
            ctx.addIssue({
              code: "custom",
              message: messages.settings_site_validation_nav_href_required(),
              path: [...path, "href"],
            });
          } else if (!isNavHref(child.href)) {
            ctx.addIssue({
              code: "custom",
              message: messages.settings_site_validation_invalid_nav_href(),
              path: [...path, "href"],
            });
          }
        });
      });
    });
}

function createSiteTextFormSchema(max: number, messages: Messages) {
  return z
    .string()
    .trim()
    .max(max, messages.settings_site_validation_too_long({ max }));
}

function createAssetRefSchema() {
  return z.string().refine((value) => value === "" || value.startsWith("/"), {
    message: "Please enter a root-relative path",
  });
}

function createAssetRefFormSchema(messages: Messages) {
  return z.string().refine((value) => value === "" || value.startsWith("/"), {
    message: messages.settings_site_validation_invalid_asset_ref(),
  });
}

function isExternalImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function createBackgroundImageRefSchema() {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || value.startsWith("/") || isExternalImageUrl(value),
      {
        message: "Please enter a root-relative path or http(s) URL",
      },
    );
}

function createBackgroundImageRefFormSchema(messages: Messages) {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || value.startsWith("/") || isExternalImageUrl(value),
      {
        message:
          messages.settings_site_validation_invalid_background_image_ref(),
      },
    );
}

function createAssetPathSchema() {
  return z.string().refine((value) => value.startsWith("/"), {
    message: "Please enter a root-relative path",
  });
}

function createAssetPathFormSchema(messages: Messages) {
  return z.string().refine((value) => value.startsWith("/"), {
    message: messages.settings_site_validation_invalid_asset_path(),
  });
}

function createOptionalAssetPathSchema() {
  return z.union([createAssetPathSchema(), z.literal("")]);
}

function createOptionalAssetPathFormSchema(messages: Messages) {
  return z.union([createAssetPathFormSchema(messages), z.literal("")]);
}

function createHueSchema() {
  return z
    .number()
    .int()
    .min(FUWARI_THEME_HUE_MIN)
    .max(FUWARI_THEME_HUE_MAX, {
      message: `Value must be between ${FUWARI_THEME_HUE_MIN} and ${FUWARI_THEME_HUE_MAX}`,
    });
}

function createHueFormSchema(messages: Messages) {
  return z.number().int().min(FUWARI_THEME_HUE_MIN).max(FUWARI_THEME_HUE_MAX, {
    message: messages.settings_site_validation_hue_range(),
  });
}

function createFuwariThemeSiteConfigSchema() {
  return z.object({
    homeBg: createBackgroundImageRefSchema(),
    avatar: createAssetRefSchema(),
    primaryHue: createHueSchema(),
    wallpaper: createBackgroundImageRefSchema().optional(),
  });
}

function createFuwariThemeSiteConfigInputSchema() {
  return z.object({
    homeBg: createBackgroundImageRefSchema().optional(),
    avatar: createAssetRefSchema().optional(),
    primaryHue: createHueSchema().optional(),
    wallpaper: createBackgroundImageRefSchema().optional(),
  });
}

function createFuwariThemeSiteConfigInputFormSchema(messages: Messages) {
  return z.object({
    homeBg: createBackgroundImageRefFormSchema(messages).optional(),
    avatar: createAssetRefFormSchema(messages).optional(),
    primaryHue: createHueFormSchema(messages).optional(),
    wallpaper: createBackgroundImageRefFormSchema(messages).optional(),
  });
}

const fuwariThemeSiteConfigSchema = createFuwariThemeSiteConfigSchema();
const fuwariThemeSiteConfigInputSchema =
  createFuwariThemeSiteConfigInputSchema();

export const FullSiteConfigSchema = z.object({
  title: createSiteTextSchema(120),
  author: createSiteTextSchema(80),
  description: createSiteTextSchema(300),
  social: z.array(SocialLinkSchema),
  navLinks: z.array(NavLinkSchema).max(NAV_LINKS_MAX),
  icons: z.object({
    faviconSvg: createAssetPathSchema(),
    faviconIco: createAssetPathSchema(),
    favicon96: createAssetPathSchema(),
    appleTouchIcon: createAssetPathSchema(),
    webApp192: createAssetPathSchema(),
    webApp512: createAssetPathSchema(),
  }),
  theme: z.object({
    fuwari: fuwariThemeSiteConfigSchema,
  }),
});

export function createSiteConfigInputFormSchema(messages: Messages) {
  return z.object({
    title: createSiteTextFormSchema(120, messages).optional(),
    author: createSiteTextFormSchema(80, messages).optional(),
    description: createSiteTextFormSchema(300, messages).optional(),
    social: z.array(SocialLinkSchema).optional(),
    navLinks: createNavLinksFormSchema(messages).optional(),
    icons: z
      .object({
        faviconSvg: createOptionalAssetPathFormSchema(messages).optional(),
        faviconIco: createOptionalAssetPathFormSchema(messages).optional(),
        favicon96: createOptionalAssetPathFormSchema(messages).optional(),
        appleTouchIcon: createOptionalAssetPathFormSchema(messages).optional(),
        webApp192: createOptionalAssetPathFormSchema(messages).optional(),
        webApp512: createOptionalAssetPathFormSchema(messages).optional(),
      })
      .optional(),
    theme: z
      .object({
        fuwari: createFuwariThemeSiteConfigInputFormSchema(messages).optional(),
      })
      .optional(),
  });
}

export const SiteConfigInputSchema = z.object({
  title: createSiteTextSchema(120).optional(),
  author: createSiteTextSchema(80).optional(),
  description: createSiteTextSchema(300).optional(),
  social: z.array(SocialLinkSchema).optional(),
  navLinks: z.array(NavLinkSchema).max(NAV_LINKS_MAX).optional(),
  icons: z
    .object({
      faviconSvg: createOptionalAssetPathSchema().optional(),
      faviconIco: createOptionalAssetPathSchema().optional(),
      favicon96: createOptionalAssetPathSchema().optional(),
      appleTouchIcon: createOptionalAssetPathSchema().optional(),
      webApp192: createOptionalAssetPathSchema().optional(),
      webApp512: createOptionalAssetPathSchema().optional(),
    })
    .optional(),
  theme: z
    .object({
      fuwari: fuwariThemeSiteConfigInputSchema.optional(),
    })
    .optional(),
});

export type SiteConfig = z.infer<typeof FullSiteConfigSchema>;
export type SiteConfigInput = z.infer<typeof SiteConfigInputSchema>;
