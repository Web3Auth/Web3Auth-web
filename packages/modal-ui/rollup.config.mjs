/* eslint-disable import/no-extraneous-dependencies */
import json from "@rollup/plugin-json";
import url from "@rollup/plugin-url";
import svgr from "@svgr/rollup";
import path from "path";
import postcss from "rollup-plugin-postcss";

export const baseConfig = {
  output: [{ dir: path.resolve("./dist/"), format: "es", sourcemap: true }],
  plugins: [
    postcss({
      config: {
        path: path.resolve("./postcss.config.js"),
      },
      extensions: [".css"],
      minimize: true,
    }),
    url(),
    svgr(),
    json(),
  ],
};
