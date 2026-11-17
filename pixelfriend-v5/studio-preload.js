const {contextBridge,ipcRenderer}=require('electron');
const call=(name,...args)=>ipcRenderer.invoke('studio:'+name,...args).then(r=>{if(!r.ok)throw new Error(r.error);return r.value;});
contextBridge.exposeInMainWorld('studio',{
 state:()=>call('state'),preferences:c=>call('preferences',c),character:()=>call('character'),upload:()=>call('upload'),activate:c=>call('activate',c),export:b=>call('export',b),
 action:(n,a)=>call('action',n,a),approve:(id,e)=>call('approve',id,e),cancel:id=>call('cancel',id),connect:(id,s)=>call('connect',id,s),disconnect:()=>call('disconnect'),configure:c=>call('configure',c),places:c=>call('places',c),notes:()=>call('notes'),legacy:()=>call('legacy'),visibility:v=>call('visibility',v)
});
