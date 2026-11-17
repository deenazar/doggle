const {test}=require('node:test');
const assert=require('node:assert/strict');
const {inspectGLB,validatePreferences,MAX_GLB}=require('../studio/character');
function glb(json,binary=Buffer.alloc(0)){
 const text=Buffer.from(JSON.stringify(json));const length=Math.ceil(text.length/4)*4;const bytes=Buffer.alloc(20+length+(binary.length?8+binary.length:0),32);
 bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(length,12);bytes.writeUInt32LE(0x4e4f534a,16);text.copy(bytes,20);
 if(binary.length){bytes.writeUInt32LE(binary.length,20+length);bytes.writeUInt32LE(0x004e4942,24+length);binary.copy(bytes,28+length);}return bytes;
}
const base={asset:{version:'2.0'},meshes:[{primitives:[]}],animations:[{name:'Idle'},{name:'Walk'}]};
test('GLB metadata preserves animation names',()=>{assert.deepEqual(inspectGLB(glb(base)).animations,['Idle','Walk']);});
test('rejects wrong format, truncated binary and excessive size',()=>{
 assert.throws(()=>inspectGLB(Buffer.from('not a glb')));const b=glb(base);assert.throws(()=>inspectGLB(b.subarray(0,b.length-1)));
 assert.throws(()=>inspectGLB(Buffer.alloc(MAX_GLB+1)));assert.throws(()=>inspectGLB(glb({...base,buffers:[{byteLength:5000}]})),/incomplete/);
});
test('external resources and compressed decoders are prohibited',()=>{
 for(const uri of ['https://example.com/texture.png','../../file.png','data:image/png;base64,AA'])assert.throws(()=>inspectGLB(glb({...base,images:[{uri}]})),/Embed/);
 assert.throws(()=>inspectGLB(glb({...base,extensionsUsed:['KHR_draco_mesh_compression']})),/compression/);
});
test('complex models and malformed chunk sizes are rejected',()=>{
 assert.throws(()=>inspectGLB(glb({...base,accessors:[{type:'VEC3',count:3000000}]})),/complex/);
 const b=glb(base);b.writeUInt32LE(12345,12);assert.throws(()=>inspectGLB(b),/length/);
});
test('desktop settings accept only bounded editable fields',()=>{
 assert.deepEqual(validatePreferences({name:'தமிழ்',size:220,roam:false,accent:'#2563eb',style:'card'}),{name:'தமிழ்',size:220,roam:false,accent:'#2563eb',style:'card'});
 for(const c of [{size:0},{speed:Infinity},{qs:24},{roam:'yes'},{hist:{}},{accent:'red'},{style:'unknown'}])assert.throws(()=>validatePreferences(c));
});
