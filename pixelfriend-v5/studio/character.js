'use strict';
const MAX_GLB = 30 * 1024 * 1024;
function inspectGLB(bytes) {
  const buffer = Buffer.from(bytes);
  if (buffer.length < 20 || buffer.length > MAX_GLB) throw new Error('Choose a GLB file smaller than 30 MB.');
  if (buffer.readUInt32LE(0) !== 0x46546c67 || buffer.readUInt32LE(4) !== 2 || buffer.readUInt32LE(8) !== buffer.length) throw new Error('This is not a complete glTF 2.0 binary (.glb) file.');
  let offset = 12, json, binarySize = 0;
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) throw new Error('Invalid GLB chunk.');
    const length = buffer.readUInt32LE(offset), type = buffer.readUInt32LE(offset + 4);
    if (length % 4 || offset + 8 + length > buffer.length) throw new Error('Invalid GLB chunk length.');
    if (offset === 12 && type !== 0x4e4f534a) throw new Error('GLB must begin with a JSON chunk.');
    if (type === 0x4e4f534a) {
      if (json || length > 2 * 1024 * 1024) throw new Error('GLB metadata is too large or duplicated.');
      try { json = JSON.parse(buffer.subarray(offset + 8, offset + 8 + length).toString('utf8')); } catch { throw new Error('Invalid GLB metadata.'); }
    }
    if (type === 0x004e4942) binarySize += length;
    offset += 8 + length;
  }
  if (!json || json.asset?.version !== '2.0' || !Array.isArray(json.meshes) || !json.meshes.length) throw new Error('The GLB must contain a visible 3D mesh.');
  if ([...(json.buffers || []), ...(json.images || [])].some(item => item.uri != null)) throw new Error('Embed every texture and buffer in the GLB. External files and URLs are not supported.');
  if ((json.extensionsUsed || []).some(x => /draco|meshopt|basisu/i.test(x))) throw new Error('Export without Draco, Meshopt or KTX2 compression.');
  if ((json.buffers || []).length > 1 || (json.buffers?.[0]?.byteLength || 0) > binarySize) throw new Error('The embedded binary buffer is incomplete.');
  if ((json.accessors || []).some(a => !Number.isSafeInteger(a.count) || a.count < 0 || a.count > 2000000) || (json.images || []).length > 64) throw new Error('Model is too complex. Simplify it before uploading.');
  const vertices = (json.accessors || []).filter(a => a.type === 'VEC3').reduce((n, a) => n + (Number.isSafeInteger(a.count) ? a.count : 10000000), 0);
  if (vertices > 2000000 || (json.nodes || []).length > 2000) throw new Error('Model is too complex. Simplify it before uploading.');
  return { meshes: json.meshes.length, animations: (json.animations || []).map((a, i) => a.name || `Animation ${i + 1}`), bytes: buffer.length };
}
const ranges = { size: [100,360], speed: [.2,3], interval: [1,240], goal: [1,30], qs: [0,23], qe: [0,23], eyesMin: [1,240], stretchMin: [1,240], postureMin: [1,240], customMin: [1,1440], snooze: [1,120] };
function validatePreferences(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid preferences.');
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (ranges[key]) { const [min,max] = ranges[key]; if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${key}`); result[key] = value; }
    else if (['roam','lap','come','sound','notify','meter','eyesOn','stretchOn','postureOn','customOn'].includes(key)) { if (typeof value !== 'boolean') throw new Error(`Invalid ${key}`); result[key] = value; }
    else if (['name','customText','ask','yay','yes','later'].includes(key)) { if (typeof value !== 'string' || value.length > 2000) throw new Error(`Invalid ${key}`); result[key] = value; }
    else if (key === 'accent') { if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error('Invalid accent'); result[key] = value; }
    else if (key === 'style') { if (!['float','comic','card'].includes(value)) throw new Error('Invalid bubble style'); result[key] = value; }
    else throw new Error('Unknown preference: ' + key);
  }
  return result;
}
module.exports = { inspectGLB, validatePreferences, MAX_GLB };
