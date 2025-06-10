import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

// This ensures path resolution works in ESM style
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      hooks: fileURLToPath(new URL('./src/hooks', import.meta.url)),
      components: fileURLToPath(new URL('./src/components', import.meta.url)),
      pages: fileURLToPath(new URL('./src/pages', import.meta.url)),
    },
  },
});
