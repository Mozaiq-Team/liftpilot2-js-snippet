import { defineConfig } from "vite";
import { babel } from "@rollup/plugin-babel";
import path from "path";

export default defineConfig({
  build: {
    target: "es2015", // Vite’s default for bundling, Babel will handle ES5 transpilation
    lib: {
      entry: path.resolve(__dirname, "src/lptracker.js"),
      name: "LPTracker",
      fileName: () => "lptracker.js",
      formats: ["iife"],
    },
    rollupOptions: {
      plugins: [
        babel({
          babelHelpers: "bundled",
          extensions: [".js"],
          // Only transpile our source and any polyfill imports; skip node_modules
          exclude: "node_modules/**",
          presets: [
            [
              "@babel/preset-env",
              {
                targets: {
                  // IE 11 and modern browsers
                  ie: "11",
                },
                useBuiltIns: "entry",
                corejs: 3,
                modules: false,
              },
            ],
          ],
        }),
      ],
    },
  },
});
