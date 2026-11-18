const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validatePreferences}=require('../studio/character');
test('desktop settings accept only bounded editable fields',()=>{
 assert.deepEqual(validatePreferences({name:'தமிழ்',size:220,roam:false,accent:'#2563eb',style:'card'}),{name:'தமிழ்',size:220,roam:false,accent:'#2563eb',style:'card'});
 for(const c of [{size:0},{speed:Infinity},{qs:24},{roam:'yes'},{hist:{}},{accent:'red'},{style:'unknown'}])assert.throws(()=>validatePreferences(c));
});
test('visit lengths, launch music and a clearable daily alarm are validated', () => {
  const settings = { visitMin: 10, restMin: 50, entryMusic: false, alarmTime: '09:30' };
  assert.deepEqual(validatePreferences(settings), settings);
  assert.deepEqual(validatePreferences({ alarmTime: '' }), { alarmTime: '' });
  for (const value of [{ visitMin: 0 }, { restMin: 1441 }, { alarmTime: '24:00' }, { entryMusic: 'true' }]) {
    assert.throws(() => validatePreferences(value));
  }
});
