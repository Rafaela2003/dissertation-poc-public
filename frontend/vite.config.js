// Vite configuration file for the React application. It sets up the development server and build options.
// The server is configured to run on port 5173 and be accessible on the local network.
// The build output is directed to the 'dist' folder, and source maps are disabled for production builds.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
