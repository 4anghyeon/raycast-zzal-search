const fs = require("fs");
const path = require("path");

// npm workspaces hoists typescript to the repo root node_modules when the raycast/worker
// devDependency versions match, so raycast/node_modules/.bin/tsc never gets created.
// `ray build -e dist` checks only "./node_modules/.bin/tsc" (no upward lookup), so it fails
// without this even though `tsc` itself resolves fine everywhere else.
const nodeModules = path.join(__dirname, "..", "node_modules");
const pkgLink = path.join(nodeModules, "typescript");
const binLink = path.join(nodeModules, ".bin", "tsc");

if (fs.existsSync(binLink)) process.exit(0);

const rootPkg = path.join(nodeModules, "..", "..", "node_modules", "typescript");
if (!fs.existsSync(rootPkg)) process.exit(0);

fs.mkdirSync(path.join(nodeModules, ".bin"), { recursive: true });

try {
  if (!fs.existsSync(pkgLink)) fs.symlinkSync("../../node_modules/typescript", pkgLink, "dir");
  fs.symlinkSync("../typescript/bin/tsc", binLink);
} catch {
  fs.rmSync(pkgLink, { recursive: true, force: true });
  fs.cpSync(rootPkg, pkgLink, { recursive: true });
  fs.cpSync(path.join(pkgLink, "bin", "tsc"), binLink);
}
