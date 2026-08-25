// Syncs apps/desktop/src-tauri/tauri.conf.json's version to the git tag that
// triggered the release (RAW_VERSION env var, e.g. "v0.2" from ref_name).
//
// Tauri requires strict X.Y.Z semver, but tags like "v0.2" (meaning 0.2.0)
// are a natural, common way to tag a release — pad any missing minor/patch
// component with 0 rather than failing the build.
const fs = require("fs");
const path = require("path");

const raw = (process.env.RAW_VERSION || "").replace(/^v/, "");
const parts = raw.split(".");
while (parts.length < 3) parts.push("0");
const version = parts.slice(0, 3).join(".");

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Tag "${process.env.RAW_VERSION}" doesn't resolve to a valid semver version (got "${version}")`);
  process.exit(1);
}

const confPath = path.join("apps", "desktop", "src-tauri", "tauri.conf.json");
const conf = JSON.parse(fs.readFileSync(confPath, "utf8"));
conf.version = version;
fs.writeFileSync(confPath, JSON.stringify(conf, null, 2) + "\n");
console.log(`Synced app version to ${version}`);
