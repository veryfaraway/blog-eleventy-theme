/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * 파일 내용의 MD5 해시를 반환합니다.
 */
function hashFile(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash("md5").update(content).digest("hex");
  } catch (_e) {
    return null;
  }
}

/**
 * 테마 원본 파일의 해시를 기록한 매니페스트를 읽습니다.
 * 매니페스트는 마지막 sync 시점의 테마 파일 해시를 저장합니다.
 * "로컬 파일 해시 === 매니페스트 해시" 이면 사용자가 수정하지 않은 것으로 판단합니다.
 */
function readManifest(manifestPath) {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (_e) {
    return {};
  }
}

function writeManifest(manifestPath, manifest) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

/**
 * srcDir의 파일들을 destDir로 복사합니다.
 *
 * 복사 규칙:
 * 1. 로컬 파일이 없으면 → 복사 (신규)
 * 2. 로컬 파일이 있고, 이전 sync 이후 사용자가 수정했으면 → 건너뜀 (보호)
 * 3. 로컬 파일이 있고, 사용자가 수정하지 않았으면 → 덮어씀 (테마 업데이트 반영)
 *
 * @param {string} srcDir  테마 소스 디렉토리
 * @param {string} destDir 블로그 대상 디렉토리
 * @param {object} manifest 이전 sync 시점의 해시 기록 { relPath: hash }
 * @param {object} nextManifest 이번 sync 후 저장할 해시 기록
 * @param {string} baseRel  상대 경로 prefix (재귀용)
 */
function syncDir(srcDir, destDir, manifest, nextManifest, baseRel = "") {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    const relPath = baseRel ? `${baseRel}/${ent.name}` : ent.name;
    const src = path.join(srcDir, ent.name);
    const dest = path.join(destDir, ent.name);

    if (ent.isDirectory()) {
      syncDir(src, dest, manifest, nextManifest, relPath);
    } else if (ent.isFile()) {
      const themeHash = hashFile(src);
      const localHash = hashFile(dest);
      const lastSyncHash = manifest[relPath];

      // 이번 sync 후 매니페스트에 테마 원본 해시를 기록
      nextManifest[relPath] = themeHash;

      if (!localHash) {
        // 케이스 1: 로컬에 파일 없음 → 신규 복사
        fs.copyFileSync(src, dest);
        console.log(`  [new]   ${relPath}`);
      } else if (localHash !== lastSyncHash && lastSyncHash !== undefined) {
        // 케이스 2: 사용자가 수정한 파일 → 건너뜀
        if (themeHash !== lastSyncHash) {
          // 테마도 바뀐 경우 충돌 경고
          console.warn(`  [skip]  ${relPath}  ⚠️  테마도 업데이트됨 — 수동 병합 필요`);
        } else {
          console.log(`  [skip]  ${relPath}  (로컬 수정 보호)`);
        }
      } else if (localHash === themeHash) {
        // 케이스 3a: 이미 최신 → 아무것도 안 함
        // (로그 생략으로 출력 간소화)
      } else {
        // 케이스 3b: 사용자 수정 없음 + 테마가 업데이트됨 → 덮어씀
        fs.copyFileSync(src, dest);
        console.log(`  [update] ${relPath}  (테마 업데이트 반영)`);
      }
    }
  }
}

function main() {
  const projectRoot = process.cwd();
  const srcRoot = path.join(projectRoot, "src");

  if (!fs.existsSync(srcRoot)) {
    console.warn(`[eleventy-theme] src/ 디렉토리가 없습니다: ${srcRoot}`);
    return;
  }

  const themeRoot = path.join(__dirname, "..", "theme");
  const manifestPath = path.join(projectRoot, ".theme-sync-manifest.json");

  const manifest = readManifest(manifestPath);
  const nextManifest = {};

  const syncTargets = [
    { src: path.join(themeRoot, "_includes"), dest: path.join(srcRoot, "_includes") },
    { src: path.join(themeRoot, "_layouts"),  dest: path.join(srcRoot, "_layouts")  },
    { src: path.join(themeRoot, "css"),       dest: path.join(srcRoot, "css")       },
  ];

  console.log("[eleventy-theme] 템플릿 동기화 시작...");
  for (const { src, dest } of syncTargets) {
    const label = path.relative(themeRoot, src);
    console.log(`  → ${label}`);
    syncDir(src, dest, manifest, nextManifest, label);
  }

  writeManifest(manifestPath, nextManifest);
  console.log("[eleventy-theme] 동기화 완료.");
}

main();
