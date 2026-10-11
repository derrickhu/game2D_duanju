/**
 * 把 minigame/ 里命中 CdnConfig.cdnPrefixes 的文件和 manifest.json 整理到 .cdn_upload/，
 * 再把整个目录传到云存储 `<filePrefix>/`（CloudBase MCP manageStorage 目录上传，或控制台拖拽）。
 *
 *   node scripts/stage_cdn.mjs
 *
 * manifest 的 hash/size 让客户端判断本地缓存是否过期，换了图不改文件名也能刷新。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = fs.readFileSync(path.join(root, 'src/config/CdnConfig.ts'), 'utf8');
const m = text.match(/export const CDN_CONFIG[^=]*=\s*({[\s\S]*?});/);
if (!m) throw new Error('无法解析 CDN_CONFIG');
const cfg = vm.runInNewContext(`(${m[1]})`, {});
const ignore = new Set(cfg.ignoreFiles);
const out = path.join(root, '.cdn_upload');

function walk(dir, rel) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    if (ignore.has(name)) continue;
    const full = path.join(dir, name);
    const r = `${rel}/${name}`;
    if (fs.statSync(full).isDirectory()) files.push(...walk(full, r));
    else if (cfg.cdnPrefixes.some((p) => r.startsWith(p))) files.push({ full, rel: r });
  }
  return files;
}

fs.rmSync(out, { recursive: true, force: true });
const files = cfg.cdnDirs.flatMap((d) => walk(path.join(root, 'minigame', d), d));
const manifest = { version: Date.now(), updated: new Date().toISOString(), filePrefix: cfg.filePrefix, files: {} };
let total = 0;
for (const f of files) {
  const buf = fs.readFileSync(f.full);
  manifest.files[f.rel] = { hash: crypto.createHash('md5').update(buf).digest('hex').slice(0, 8), size: buf.length };
  const dest = path.join(out, f.rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(f.full, dest);
  total += buf.length;
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`[stage_cdn] ${files.length} 个文件，${(total / 1048576).toFixed(1)} MB → .cdn_upload/（上传到云存储 ${cfg.filePrefix}/）`);
