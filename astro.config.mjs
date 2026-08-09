// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  base: '/striner/perler',

  server: {
    host: '0.0.0.0',
    port: 8082
  },

  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en'
  },

  vite: {
    plugins: [tailwindcss()]
  }
});
