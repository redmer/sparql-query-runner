import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import jest from "eslint-plugin-jest";
import globals from "globals";

const tsRecommended = tseslint.configs["flat/recommended"];
const jestRecommended = jest.configs["flat/recommended"];

export default [
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  eslint.configs.recommended,
  ...tsRecommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.test.ts"],
    plugins: jestRecommended.plugins,
    languageOptions: {
      globals: {
        ...jestRecommended.languageOptions.globals,
      },
    },
    rules: {
      ...jestRecommended.rules,
    },
  },
];
