---
name: Structural Minimalist
colors:
  surface: '#f6fafe'
  surface-dim: '#d6dade'
  surface-bright: '#f6fafe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f8'
  surface-container: '#eaeef2'
  surface-container-high: '#e4e9ed'
  surface-container-highest: '#dfe3e7'
  on-surface: '#171c1f'
  on-surface-variant: '#43474d'
  inverse-surface: '#2c3134'
  inverse-on-surface: '#edf1f5'
  outline: '#74777e'
  outline-variant: '#c3c6ce'
  surface-tint: '#49607c'
  primary: '#00152a'
  on-primary: '#ffffff'
  primary-container: '#102a43'
  on-primary-container: '#7a92b0'
  inverse-primary: '#b0c9e8'
  secondary: '#46617b'
  on-secondary: '#ffffff'
  secondary-container: '#c4e0fe'
  on-secondary-container: '#48637d'
  tertiary: '#201100'
  on-tertiary: '#ffffff'
  tertiary-container: '#3b2400'
  on-tertiary-container: '#ad8a5a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d1e4ff'
  primary-fixed-dim: '#b0c9e8'
  on-primary-fixed: '#011d35'
  on-primary-fixed-variant: '#314863'
  secondary-fixed: '#cee5ff'
  secondary-fixed-dim: '#aec9e7'
  on-secondary-fixed: '#001d32'
  on-secondary-fixed-variant: '#2e4962'
  tertiary-fixed: '#ffddb4'
  tertiary-fixed-dim: '#e8c08c'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#5d4119'
  background: '#f6fafe'
  on-background: '#171c1f'
  surface-variant: '#dfe3e7'
typography:
  h1:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2.5rem
  xxl: 4rem
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is rooted in the philosophy of "Quiet Productivity." It prioritizes focus by removing visual noise and using whitespace as a functional element rather than just a decorative one. The target audience consists of high-performance professionals who require a tool that feels reliable, organized, and unobtrusive. 

The aesthetic is strictly Minimalist, characterized by precision, intentionality, and a lack of ornamentation. It avoids trends like heavy shadows or vibrant blurs in favor of structural integrity and clear information hierarchy. The emotional response should be one of calm control and intellectual clarity.

## Colors
The color palette is intentionally restrained to prevent cognitive overload. The foundation is built on absolute white and a series of cool-toned grays that provide structure without creating high-contrast fatigue. 

- **Primary:** A deep, scholarly blue used for high-importance actions and active states.
- **Surface:** Pure white for the main work area to maximize legibility.
- **Neutrals:** Soft "Slate" grays are used for secondary text, borders, and subtle background shifts to denote different functional zones.
- **Accents:** Beyond the primary blue, color should only be used functionally (e.g., error red or success green) and never for purely aesthetic flair.

## Typography
Inter is the sole typeface for this design system, chosen for its exceptional legibility and neutral, systematic character. The typographic scale is designed to create a clear "path of sight" through complex data.

Large headings use a slightly tighter letter spacing and heavier weight to feel grounded. Body text relies on a generous 1.6x line height to improve reading endurance. Small labels and metadata use an increased letter spacing and a semi-bold weight to ensure they remain legible despite their reduced scale.

## Layout & Spacing
The design system employs a rigid 8px grid system. Layouts should favor a fixed-width central container for focused tasks, while dashboards can utilize a fluid 12-column grid. 

Whitespace is treated as a first-class citizen. Components should be spaced generously to prevent the UI from feeling "cramped." Use the `xxl` (64px) spacing unit to separate major sections of the interface, ensuring that the user’s eye has a clear place to rest between different functional blocks.

## Elevation & Depth
Depth is communicated through **low-contrast outlines** and **tonal layering** rather than shadows. 

1. **Surface Level 0 (Base):** The primary background, usually #FFFFFF.
2. **Surface Level 1 (Panels):** Defined by a 1px border (#DCE3E8). No shadow.
3. **Surface Level 2 (Interactive/Floating):** Used for menus or modals. These may use an extremely soft, large-radius shadow (opacity < 5%) simply to separate the element from the content below, but a 1px border remains the primary identifier.

Avoid any "pop" or "glow" effects. If an element needs to stand out, use a subtle background tint (#F0F4F8) instead of increasing its elevation.

## Shapes
The shape language is "Soft" (4px - 8px radius). This provides a slight approachable feel while maintaining the professional, architectural rigor of the system. 

Buttons and input fields use a standard 4px radius (`rounded`). Larger containers like cards or modals use an 8px radius (`rounded-lg`). Circle shapes are reserved exclusively for avatars or status indicators to distinguish them from interactive UI elements.

## Components

- **Buttons:** Primary buttons are solid Deep Blue with white text. Secondary buttons are "Ghost" style, using a 1px border (#DCE3E8) and dark gray text. There are no gradients; states are signaled by subtle opacity shifts or background color darkening.
- **Inputs:** Text fields use a 1px border. When focused, the border transitions to the primary Deep Blue. No "outer glow" should be applied on focus.
- **Cards:** Cards are containers with a 1px border and 0px shadow. They should rely on internal padding (typically `lg` or 24px) to organize content.
- **Chips/Tags:** Small, low-contrast pills with a light gray background and dark gray text. They should not look like buttons.
- **Lists:** Items are separated by thin horizontal rules (#DCE3E8). Interactive list items should show a #F0F4F8 background on hover with a sharp transition (no slow fade).
- **Checkboxes:** Square with a 2px radius. When checked, they fill with the primary color and a simple white checkmark.