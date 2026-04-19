---
name: pillar-card-ui
description: Use this skill when building or styling pillar card components, pillar UI, or any component that uses pillar colors, icons, or the PILLAR_CONFIG object.
---

# Pillar Card UI

## PILLAR_CONFIG

Pillar colors and icons are defined once in `/lib/constants.ts` as PILLAR_CONFIG.
Always import from there — never hardcode hex values inline.

```ts
export const PILLAR_CONFIG = {
  spiritual: {
    background: '#275578',
    title: '#82B2DE',
    subtitle: '#608BAF',
    saveButton: '#376891',
    icon: '/spiritual_icon.png',
    label: 'Spiritual',
  },
  physical: {
    background: '#202644',
    title: '#8A96CD',
    subtitle: '#656E96',
    saveButton: '#2C345B',
    icon: '/physical_icon.png',
    label: 'Physical',
  },
  nutritional: {
    background: '#B85D27',
    title: '#F7B188',
    subtitle: '#D19675',
    saveButton: '#CC6930',
    icon: '/nutritional_icon.png',
    label: 'Nutritional',
  },
  personal: {
    background: '#2E5144',
    title: '#96CE95',
    subtitle: '#77A676',
    saveButton: '#3B6051',
    icon: '/personal_icon.png',
    label: 'Personal',
  },
  relational: {
    background: '#317C80',
    title: '#82C7CB',
    subtitle: '#6AA2A6',
    saveButton: '#3F9297',
    icon: '/relational_icon.png',
    label: 'Relational',
  },
} as const
```

## Color usage rules

- For pillar card backgrounds, titles, subtitle text, and save buttons — always use
  Tailwind arbitrary value syntax with exact hex codes: `bg-[#275578]`, `text-[#82B2DE]`
- Do NOT use Tailwind named classes (e.g. `bg-purple-600`) for pillar card UI
- The authoritative hex values are in PRODUCT.md under Visual Design System

## Global app background

- App background is `#EBEBEC` — apply as `bg-[#EBEBEC]` on the root layout
- Do not use `bg-gray-100` or any Tailwind gray approximation

## Icons

- Always use Next.js `<Image>` component for pillar icons and the app logo
- Icons live in `/public` — reference as `/spiritual_icon.png`, `/physical_icon.png`, etc.
- Never use emoji or placeholder text once icon files are confirmed present