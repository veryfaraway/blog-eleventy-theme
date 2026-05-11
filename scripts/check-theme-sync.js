/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function hashFile(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash("md5").update(content).digest("hex");
  } catch (_e) { return null; }
}

function checkDir(srcDir, destDir, baseRel = "") {
  if (!fs.existsSync(srcDir)) return true;
  let isSynced = true;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const ent of entries) {
    const relPath = baseRel ? `${baseRel}/${ent.name}` : ent.name;
    const src = path.join(srcDir, ent.name);
    const dest = path.join(destDir, ent.name);

    if (ent.isDirectory()) {
      if (!checkDir(src, dest, relPath)) isSynced = false;
    } else if (ent.isFile()) {
      if (hashFile(src) !== hashFile(dest)) {
        console.error(`  [drift] ${relPath} - 원본과 파일이 다릅니다.`);
        isSynced = false;
      }
    }
  }
  return isSynced;
}

const themeRoot = path.join(__dirname, "..", "theme");
const srcRoot = path.join(process.cwd(), "src");
const syncTargets = [
  { src: path.join(themeRoot, "_includes"), dest: path.join(srcRoot, "_includes") },
  { src: path.join(themeRoot, "_layouts"),  dest: path.join(srcRoot, "_layouts")  },
  { src: path.join(themeRoot, "css"),       dest: path.join(srcRoot, "css")       },
];

console.log("[eleventy-theme] 동기화 상태 확인 중...");
let allSynced = true;
for (const { src, dest } of syncTargets) {
  if (!checkDir(src, dest, path.relative(themeRoot, src))) allSynced = false;
}

if (allSynced) {
  console.log("[eleventy-theme] 모든 템플릿이 최신 상태입니다.");
  process.exit(0);
} else {
  console.error("[eleventy-theme] ⚠️ 드리프트 감지됨. 동기화가 필요합니다.");
  process.exit(1);
}
