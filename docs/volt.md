Installation with Vite
Setting up Volt in a Vite project with PrimeVue and Tailwind.

Tailwind CSS
Volt requires Tailwind CSS v4+ for theming. The prerequisite steps are covered by the Install Tailwind CSS with Vite guide. If you have Vite and Tailwind configured successfully, follow the next steps.

After successfully installing Tailwind, proceed with the installation of the tailwindcss-primeui plugin. This plugin extends Tailwind with new utility classes such as text-primary, bg-surface-500, and adds new variants with the p- prefix including p-selected.

In addition tailwind-merge utility is required for efficient handling of external class merging.

npm i tailwindcss-primeui
npm i tailwind-merge

In the CSS file that contains the tailwindcss import, add the tailwindcss-primeui import as well.

@import "tailwindcss";
@import "tailwindcss-primeui";

PrimeVue
PrimeVue is available for download on npm registry.

# Using npm

npm install primevue

# Using yarn

yarn add primevue

# Using pnpm

pnpm add primevue

Configure PrimeVue to enable the unstyled mode that disables the default design token based theming globally.

import { createApp } from 'vue';
import PrimeVue from 'primevue/config';

const app = createApp(App);
app.use(PrimeVue, {
unstyled: true
});

Vite Config
The @ alias is recommended to refer to a source folder in your application where Volt components are located as a subfolder. Without this alias, tedious relative paths like ../../ may be required.

import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
//...,
resolve: {
alias: [
{ find: "@", replacement: path.resolve(__dirname, "./src") }
]
}
});

CSS Variables
Final step is defining the default values for the CSS variables utilized by the tailwindcss-primeui, this can be done in a global CSS file in your Vite application e.g. src/assets/base.css.

With a future update of the primeui tailwind plugin, this step will be done implicitly.

/_ Primary and Surface Palettes _/
:root {
--p-primary-50: #ecfdf5;
--p-primary-100: #d1fae5;
--p-primary-200: #a7f3d0;
--p-primary-300: #6ee7b7;
--p-primary-400: #34d399;
--p-primary-500: #10b981;
--p-primary-600: #059669;
--p-primary-700: #047857;
--p-primary-800: #065f46;
--p-primary-900: #064e3b;
--p-primary-950: #022c22;
--p-surface-0: #ffffff;
--p-surface-50: #fafafa;
--p-surface-100: #f4f4f5;
--p-surface-200: #e4e4e7;
--p-surface-300: #d4d4d8;
--p-surface-400: #a1a1aa;
--p-surface-500: #71717a;
--p-surface-600: #52525b;
--p-surface-700: #3f3f46;
--p-surface-800: #27272a;
--p-surface-900: #18181b;
--p-surface-950: #09090b;
--p-content-border-radius: 6px;
}

/_ Light _/
:root {
--p-primary-color: var(--p-primary-500);
--p-primary-contrast-color: var(--p-surface-0);
--p-primary-hover-color: var(--p-primary-600);
--p-primary-active-color: var(--p-primary-700);
--p-content-border-color: var(--p-surface-200);
--p-content-hover-background: var(--p-surface-100);
--p-content-hover-color: var(--p-surface-800);
--p-highlight-background: var(--p-primary-50);
--p-highlight-color: var(--p-primary-700);
--p-highlight-focus-background: var(--p-primary-100);
--p-highlight-focus-color: var(--p-primary-800);
--p-text-color: var(--p-surface-700);
--p-text-hover-color: var(--p-surface-800);
--p-text-muted-color: var(--p-surface-500);
--p-text-hover-muted-color: var(--p-surface-600);
}

/\*

- Dark Mode
- Defaults to system, change the dark variant selector to match the CSS variable configuration.
- For example;
- @custom-variant dark (&:where(.app-dark, .app-dark \*));
- should match to;
- :root[class="app-dark"]
  \*/
  @media (prefers-color-scheme: dark) {
  :root {
  --p-primary-color: var(--p-primary-400);
  --p-primary-contrast-color: var(--p-surface-900);
  --p-primary-hover-color: var(--p-primary-300);
  --p-primary-active-color: var(--p-primary-200);
  --p-content-border-color: var(--p-surface-700);
  --p-content-hover-background: var(--p-surface-800);
  --p-content-hover-color: var(--p-surface-0);
  --p-highlight-background: color-mix(in srgb, var(--p-primary-400), transparent 84%);
  --p-highlight-color: rgba(255, 255, 255, 0.87);
  --p-highlight-focus-background: color-mix(in srgb, var(--p-primary-400), transparent 76%);
  --p-highlight-focus-color: rgba(255, 255, 255, 0.87);
  --p-text-color: var(--p-surface-0);
  --p-text-hover-color: var(--p-surface-0);
  --p-text-muted-color: var(--p-surface-400);
  --p-text-hover-muted-color: var(--p-surface-300);
  }
  }

Download
Download the Volt components to your application codebase on demand with the npx volt-vue command. Refer to the individiual documentation pages of the components to access the download command per component.

npx volt-vue add Button
npx volt-vue add DataTable
npx volt-vue add Dialog
npx volt-vue add DatePicker

Register
Register the Volt components locally or globally. Visit the component registration to learn more.

<template>
    <div>
        <h1>Your Application</h1>
        <Button label="Hello World" />
    </div>
</template>

<script setup lang="ts">
import Button from '@/volt/Button.vue'; // local registration
</script>
