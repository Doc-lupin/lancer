import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative paths in the build, so dist/ works from any folder or address
  // (task 2.11: the GM's phone test).
  base: './',
});
