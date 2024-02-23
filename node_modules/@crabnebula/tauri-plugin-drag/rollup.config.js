import { readFileSync } from "fs";

import { join } from "path";
import { cwd } from "process";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

const pkg = JSON.parse(readFileSync(join(cwd(), "package.json"), "utf8"));

const pluginJsName = "drag";
const iifeVarName = `__TAURI_PLUGIN_${pluginJsName.toUpperCase()}__`;

export default [
  {
    input: "guest-js/index.ts",
    output: [
      {
        file: pkg.exports.import,
        format: "esm",
      },
      {
        file: pkg.exports.require,
        format: "cjs",
      },
    ],
    plugins: [
      typescript({
        declaration: true,
        declarationDir: `./${pkg.exports.import.split("/")[0]}`,
      }),
    ],
    external: [
      /^@tauri-apps\/api/,
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
    ],
    onwarn: (warning) => {
      throw Object.assign(new Error(), warning);
    },
  },

  {
    input: "guest-js/index.ts",
    output: {
      format: "iife",
      name: iifeVarName,
      // IIFE is in the format `var ${iifeVarName} = (() => {})()`
      // we check if __TAURI__ exists and inject the API object
      banner: "if ('__TAURI__' in window) {",
      // the last `}` closes the if in the banner
      footer: `Object.defineProperty(window.__TAURI__, '${pluginJsName}', { value: ${iifeVarName} }) }`,
      file: "../../crates/tauri-plugin-drag/src/api-iife.js",
    },
    // and var is not guaranteed to assign to the global `window` object so we make sure to assign it
    plugins: [typescript(), terser(), nodeResolve()],
    onwarn: (warning) => {
      throw Object.assign(new Error(), warning);
    },
  },
];
