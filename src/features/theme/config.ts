// 添加新主题，这里需要同步更新
export const themeNames = ["default", "fuwari"] as const;
export type ThemeName = (typeof themeNames)[number];

export interface ThemeConfig {
  // 是否开启路由级的 viewTransition 过渡动画
  viewTransition: boolean;
}

export const themes: Record<ThemeName, ThemeConfig> = {
  default: {
    viewTransition: true,
  },
  fuwari: {
    viewTransition: false,
  },
};
