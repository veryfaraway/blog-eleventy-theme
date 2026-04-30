/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    const src = path.join(srcDir, ent.name);
    const dest = path.join(destDir, ent.name);
    if (ent.isDirectory()) {
      copyDir(src, dest);
    } else if (ent.isFile()) {
      fs.copyFileSync(src, dest);
    }
  }
}

function main() {
  const projectRoot = process.cwd();
  const srcRoot = path.join(projectRoot, "src");
  const includesDest = path.join(srcRoot, "_includes");
  const layoutsDest = path.join(srcRoot, "_layouts");

  const themeRoot = path.join(__dirname, "..", "theme");
  const includesSrc = path.join(themeRoot, "_includes");
  const layoutsSrc = path.join(themeRoot, "_layouts");

  if (!fs.existsSync(srcRoot)) {
    console.warn(`[eleventy-theme] No src/ directory found at ${srcRoot}; skipping template sync.`);
    return;
  }

  copyDir(includesSrc, includesDest);
  copyDir(layoutsSrc, layoutsDest);

  console.log("[eleventy-theme] Synced templates to src/_includes and src/_layouts");
}

main();

