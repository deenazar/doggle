const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validatePreferences}=require('../studio/character');
test('desktop settings accept only bounded editable fields',()=>{
 assert.deepEqual(validatePreferences({name:'தமிழ்',size:220,roam:false,accent:'#2563eb',style:'card'}),{name:'தமிழ்',size:220,roam:false,accent:'#2563eb',style:'card'});
 for(const c of [{size:0},{speed:Infinity},{qs:24},{roam:'yes'},{hist:{}},{accent:'red'},{style:'unknown'}])assert.throws(()=>validatePreferences(c));
});
