const fs = require("node:fs");
const path = require("node:path");

/**
 * Nest webpack emits CommonJS `require()` for node externals.
 * Root package.json has `"type": "module"`, so without this marker
 * `node dist/main.js` (and start:dev) crashes with "require is not defined".
 */
class WriteDistPackageJsonPlugin {
  apply(compiler) {
    compiler.hooks.done.tap("WriteDistPackageJsonPlugin", () => {
      const outDir = compiler.options.output?.path ?? path.join(__dirname, "dist");
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(
        path.join(outDir, "package.json"),
        JSON.stringify({ type: "commonjs" }),
      );
    });
  }
}

module.exports = function (options) {
  return {
    ...options,
    plugins: [...(options.plugins ?? []), new WriteDistPackageJsonPlugin()],
  };
};
