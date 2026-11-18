'use strict';
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
module.exports = { validatePreferences };
