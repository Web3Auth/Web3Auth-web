import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { dirname, resolve } from "node:path";
// import devtools from 'solid-devtools/vite';

export default defineConfig({
  plugins: [
    /* 
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    solidPlugin(),
  ],
  server: {
    port: 3000,
  },
  // resolve: {
  //   alias: {
  //     buffer: resolve("../../node_modules/buffer"),
  //     process: resolve("../../node_modules/process"),
  //   },
  // },
  define: {
    global: "globalThis",
  },
  build: {
    target: "esnext",
    lib: {
      entry: resolve(__dirname, "src/loginModal.tsx"),
      name: "Ui",
      fileName: (format) => `ui.${format}.js`,
      formats: ["es", "umd", "cjs"],
    },
    rollupOptions: {
      external: ["solid-js"],
      output: {
        globals: {
          "solid-js": "Solid",
        },
      },
    },
  },
});
