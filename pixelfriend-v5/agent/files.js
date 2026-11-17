'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const GROUPS = { Images: ['jpg','jpeg','png','gif','webp','heic','svg'], Documents: ['pdf','txt','md','doc','docx','xls','xlsx','csv','ppt','pptx'], Audio: ['mp3','wav','m4a','flac'], Videos: ['mp4','mov','mkv','webm'], Archives: ['zip','tar','gz','7z','rar'], Installers: ['dmg','pkg'] };
async function preview(downloads) {
  const root = await fs.realpath(downloads);
  const moves = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    const ext = path.extname(entry.name).slice(1).toLowerCase();
    const group = Object.keys(GROUPS).find(k => GROUPS[k].includes(ext));
    if (!group) continue;
    const stat = await fs.lstat(path.join(root, entry.name));
    if (!stat.isFile() || Date.now() - stat.mtimeMs < 60000) continue;
    moves.push({ name: entry.name, group, size: stat.size, mtimeMs: stat.mtimeMs, ino: stat.ino });
  }
  return { root, moves };
}
async function execute(plan) {
  if (await fs.realpath(plan.root) !== plan.root) throw new Error('Downloads location changed. Preview again.');
  const result = { moved: [], skipped: [] };
  for (const item of plan.moves) {
    const source = path.join(plan.root, item.name);
    const dir = path.join(plan.root, item.group);
    try {
      if (path.basename(item.name) !== item.name || !Object.hasOwn(GROUPS, item.group)) throw new Error('Invalid file plan');
      const current = await fs.lstat(source);
      if (!current.isFile() || current.size !== item.size || current.mtimeMs !== item.mtimeMs || current.ino !== item.ino) throw new Error('File changed since preview');
      await fs.mkdir(dir, { recursive: true });
      const ds = await fs.lstat(dir);
      if (!ds.isDirectory() || ds.isSymbolicLink() || await fs.realpath(dir) !== dir) throw new Error('Destination must be a real folder');
      const destination = path.join(dir, item.name);
      // Atomic, no-overwrite creation. The source stays intact if a destination exists.
      await fs.link(source, destination);
      const check = await fs.lstat(source);
      if (check.ino !== current.ino || check.size !== current.size || check.mtimeMs !== current.mtimeMs) {
        await fs.unlink(destination); throw new Error('File changed during move');
      }
      await fs.unlink(source);
      result.moved.push({ from: source, to: destination });
    } catch (e) { result.skipped.push({ name: item.name, reason: e.code === 'EEXIST' ? 'Destination already exists' : e.message }); }
  }
  return result;
}
async function saveNote(folder, title, body) {
  if (typeof title !== 'string' || !title.trim() || title.length > 200 || typeof body !== 'string' || body.length > 30000) throw new Error('Invalid note');
  await fs.mkdir(folder, { recursive: true, mode: 0o700 });
  const name = new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomUUID() + '.md';
  await fs.writeFile(path.join(folder, name), `# ${title}\n\n${body}\n`, { flag: 'wx', mode: 0o600 });
  return { title, file: name };
}
module.exports = { preview, execute, saveNote };
