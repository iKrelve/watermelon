# Requirements: Theme System Refactoring

## Introduction

小西瓜（Watermelon）当前使用基于 shadcn/ui 的 oklch 色彩方案，亮色主题参考 Things 3 风格（暖白+蓝紫色调），暗色主题使用标准 shadcn dark，整体缺乏品牌一致性。本次重构将：

1. 重新设计色彩方案，偏向 Apple macOS 原生风格（毛玻璃效果、系统色、原生感）
2. 支持多套主题切换（至少包含：经典亮色、经典暗色、以及额外风格主题）
3. 系统化整理所有硬编码颜色为 CSS 变量，确保亮/暗模式一致性
4. 优化动画和视觉效果（更精致的过渡和微交互）

## Glossary

- **Theme_System**: 管理应用所有视觉主题的完整系统，包含 CSS 变量定义、主题切换逻辑、持久化存储
- **Theme_Provider**: React 上下文提供者，负责向组件树注入当前主题并提供切换 API
- **Color_Token**: CSS 自定义属性（变量），用于定义可复用的颜色值，如 `--primary`、`--background`
- **Theme_Preset**: 一套完整的 Color_Token 值组合，代表一个可选择的主题方案
- **Vibrancy_Effect**: macOS 原生的毛玻璃/半透明效果，通过 `backdrop-filter: blur()` 和半透明背景实现
- **Semantic_Color**: 按用途而非色相命名的颜色 token，如 "destructive"、"success"、"warning"
- **Hardcoded_Color**: 直接写在组件中的具体颜色值（如 `#22c55e`、`text-red-500`），未通过 CSS 变量抽象

## Requirements

### Requirement 1: Theme Preset System

**User Story:** As a user, I want to choose from multiple theme presets, so that I can personalize the look and feel of the app to my preference.

#### Acceptance Criteria

1. THE Theme_System SHALL provide at least four Theme_Presets: "Apple Light"（苹果亮色）, "Apple Dark"（苹果暗色）, "Soft Pastel"（柔和马卡龙色）, and "Midnight"（深邃午夜）
2. WHEN a user selects a Theme_Preset, THE Theme_System SHALL apply all Color_Tokens from that preset to the entire application within 100ms
3. WHEN a user selects a Theme_Preset, THE Theme_System SHALL persist the selection to localStorage
4. WHEN the application starts, THE Theme_System SHALL restore the previously selected Theme_Preset from localStorage
5. WHERE the "System" option is selected, THE Theme_System SHALL follow the operating system's light/dark mode preference and apply the corresponding Apple Light or Apple Dark preset

### Requirement 2: Apple-Native Color Palette

**User Story:** As a macOS user, I want the app to feel native to my operating system, so that the visual experience is cohesive with the rest of my desktop.

#### Acceptance Criteria

1. THE Theme_System SHALL define Color_Tokens using the oklch color space for all Theme_Presets
2. THE "Apple Light" preset SHALL use a cool-neutral base palette with system-blue (#007AFF equivalent in oklch) as the primary accent color
3. THE "Apple Dark" preset SHALL use elevated surface layers (not pure black) with system-blue as primary, matching macOS Sonoma dark mode aesthetics
4. THE Theme_System SHALL define Semantic_Colors for: primary, secondary, destructive, success, warning, muted, accent, and border
5. WHEN switching between light and dark presets, THE color contrast ratios SHALL meet WCAG AA standards (minimum 4.5:1 for normal text)

### Requirement 3: Vibrancy and Glassmorphism Effects

**User Story:** As a user, I want the sidebar and overlays to have subtle translucency effects, so that the app feels modern and native to macOS.

#### Acceptance Criteria

1. WHILE the "Apple Light" or "Apple Dark" preset is active, THE sidebar background SHALL use a semi-transparent background with `backdrop-filter: blur()` to create a Vibrancy_Effect
2. WHILE any Theme_Preset is active, THE popover and dropdown overlays SHALL use a subtle frosted-glass background
3. IF the user's system has `prefers-reduced-transparency: reduce` enabled, THEN THE Theme_System SHALL disable all Vibrancy_Effects and use solid backgrounds instead

### Requirement 4: Hardcoded Color Elimination

**User Story:** As a developer, I want all colors referenced through semantic CSS variables, so that theme switching works correctly across the entire app.

#### Acceptance Criteria

1. THE Theme_System SHALL replace all Hardcoded_Colors in component files with corresponding Semantic_Color CSS variable references
2. THE Theme_System SHALL define additional Color_Tokens for priority indicators: `--priority-high`, `--priority-medium`, `--priority-low`
3. THE Theme_System SHALL define Color_Tokens for chart colors: `--chart-1` through `--chart-5`
4. THE Theme_System SHALL define Color_Tokens for status indicators: `--status-success`, `--status-warning`, `--status-error`
5. WHEN any Theme_Preset is applied, THE entire UI SHALL use only colors from CSS variables (zero Hardcoded_Colors in rendering output)

### Requirement 5: Theme Switching UI

**User Story:** As a user, I want an intuitive way to switch themes from the sidebar, so that I can easily change the app's appearance.

#### Acceptance Criteria

1. THE sidebar footer SHALL display a theme selector that shows available Theme_Presets with visual previews (color swatches)
2. WHEN a user clicks a Theme_Preset in the selector, THE Theme_System SHALL immediately apply the selected theme
3. WHEN a user hovers over a Theme_Preset option, THE UI SHALL show a tooltip with the preset name
4. THE theme selector SHALL include a "System" option that follows OS light/dark preference

### Requirement 6: Animation and Transition Refinement

**User Story:** As a user, I want smooth and subtle animations throughout the app, so that interactions feel polished and responsive.

#### Acceptance Criteria

1. WHEN a Theme_Preset is switched, THE Theme_System SHALL apply a smooth color transition across all elements (duration 200ms, ease-out)
2. THE Theme_System SHALL define CSS custom properties for animation durations: `--duration-fast` (100ms), `--duration-normal` (200ms), `--duration-slow` (300ms)
3. WHILE `prefers-reduced-motion: reduce` is active, THE Theme_System SHALL set all animation durations to near-zero (1ms)
4. THE task completion animation SHALL use a subtle scale + opacity effect consistent with macOS native interaction patterns
5. THE list item hover states SHALL use a gentle background-color transition (150ms ease)

### Requirement 7: Theme-Aware Component Consistency

**User Story:** As a user, I want all parts of the app to look consistent regardless of theme, so that the visual experience is cohesive.

#### Acceptance Criteria

1. WHEN any Theme_Preset is active, THE Statistics chart colors SHALL use the theme's `--chart-*` Color_Tokens
2. WHEN any Theme_Preset is active, THE Calendar view highlight colors SHALL use the theme's Semantic_Colors
3. WHEN any Theme_Preset is active, THE RichTextEditor placeholder, blockquote, and code block styles SHALL use the theme's Color_Tokens
4. WHEN any Theme_Preset is active, THE selection highlight color (`::selection`) SHALL use the theme's primary color at reduced opacity

