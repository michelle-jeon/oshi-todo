import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".desktop/**", "dist/**"]
  },
  ...nextVitals,
  ...nextTs
];

export default eslintConfig;
