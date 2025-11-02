import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    cssCodeSplit: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
            return 'react-vendor';
          }
          // Router
          if (id.includes('react-router')) {
            return 'router';
          }
          // UI Components (Radix UI)
          if (id.includes('@radix-ui')) {
            return 'ui-vendor';
          }
          // Forms and validation
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
            return 'forms';
          }
          // Data fetching
          if (id.includes('@tanstack/react-query') || id.includes('@supabase')) {
            return 'data-vendor';
          }
          // Charts and visualizations
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts';
          }
          // Utilities
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('class-variance')) {
            return 'utils';
          }
          // Icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }
        },
      },
    },
  },
}));
