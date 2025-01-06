const prefix = ".w3a-parent-container";

module.exports = {
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  plugins: {
    tailwindcss: {},
    "postcss-prefix-selector": {
      prefix,
      transform(_, selector, prefixedSelector) {
        // if selector is already the prefix just return it
        // e.g. in the case of css vars that we put under prefix
        if (selector === prefix) {
          return selector;
        }
        return prefixedSelector;
      },
    },
  },
};
