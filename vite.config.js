import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import WindiCSS from 'vite-plugin-windicss';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), WindiCSS()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@fortawesome': path.resolve(__dirname, './node_modules/@fortawesome/fontawesome-free'), // Add this line
    },
  },
});
