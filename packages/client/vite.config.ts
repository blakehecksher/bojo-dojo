import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@bojo-dojo/common': path.resolve(__dirname, '../common/src'),
    },
  },
  server: {
    host: true,
  },
});
