require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  root: true,
  extends: ["@toruslabs/react"],
  parser: "vue-eslint-parser",
  ignorePatterns: ["*.config.js", ".eslintrc.js", "*.config.mts"],
  parserOptions: {
    parser: "@typescript-eslint/parser",
    sourceType: "module",
    ecmaVersion: 2022,
    project: "./tsconfig.json",
  },
  env: {
    browser: true,
    node: true,
    mocha: true,
  },
  rules: {
    camelcase: 0,
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        js: "never",
        jsx: "never",
        ts: "never",
        tsx: "never",
      },
    ],
  },
};
