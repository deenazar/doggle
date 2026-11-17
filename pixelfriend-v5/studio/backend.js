'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { inspectGLB, validatePreferences, MAX_GLB } = require('./character');
function registerStudio({ app, ipcMain, dialog, shell, getWindow, getBuddy, service }) {
  const folder = path.join(app.getPath('userData'), 'character-studio');
  let candidate = null;
  const readCharacter = async () => { try { return JSON.parse(await fs.readFile(path.join(folder,'character.json'),'utf8')); } catch { return { kind:'original', name:'Original companion', rotation:0 }; } };
  const characterData = async () => { const config = await readCharacter();return { ...config, bytes: config.kind === 'custom' ? Array.from(await fs.readFile(path.join(folder,'active.glb'))) : null }; };
  const buddy = async (method, value) => {
    const window = getBuddy();if (!window || window.isDestroyed()) throw new Error('Desktop companion is not ready.');
    return window.webContents.executeJavaScript(`window.toggleDesktop.${method}(${value === undefined ? '' : JSON.stringify(value)})`);
  };
  const handlers = {
    state: async () => ({ desktop: await buddy('getSettings'), agent: await service.state(), character: await readCharacter() }),
    preferences: config => buddy('updateSettings',validatePreferences(config)),
    character: characterData,
    upload: async () => {
      const selection = await dialog.showOpenDialog(getWindow(),{ title:'Choose your 3D character', properties:['openFile'], filters:[{ name:'3D character',extensions:['glb'] }] });
      if (selection.canceled) return null;
      const file = selection.filePaths[0];const stat = await fs.stat(file);if (stat.size > MAX_GLB) throw new Error('Choose a GLB smaller than 30 MB.');
      const bytes = await fs.readFile(file);const metadata = inspectGLB(bytes);
      candidate = { bytes, name:path.basename(file), metadata };
      return { kind:'custom',name:candidate.name,metadata,bytes:Array.from(bytes) };
    },
    activate: async config => {
      if (!config || !['starter','original','custom'].includes(config.kind) || !Number.isFinite(config.rotation) || Math.abs(config.rotation)>180) throw new Error('Invalid character settings.');
      await fs.mkdir(folder,{recursive:true,mode:0o700});
      let current = await readCharacter();
      if (config.kind === 'custom') {
        if (candidate) { await fs.writeFile(path.join(folder,'active.glb.tmp'),candidate.bytes,{mode:0o600});await fs.rename(path.join(folder,'active.glb.tmp'),path.join(folder,'active.glb'));current = { name:candidate.name,metadata:candidate.metadata }; }
        else if (current.kind !== 'custom') throw new Error('Upload and preview a GLB first.');
      }
      const next = { kind:config.kind, name:config.kind === 'starter' ? 'Orbit · 3D companion' : config.kind === 'original' ? 'Original companion' : current.name, rotation:config.rotation, metadata: config.kind === 'custom' ? current.metadata : null };
      await fs.writeFile(path.join(folder,'character.json.tmp'),JSON.stringify(next),{mode:0o600});await fs.rename(path.join(folder,'character.json.tmp'),path.join(folder,'character.json'));
      candidate = null;
      getBuddy()?.webContents.send('pf:character-changed');
      return next;
    },
    export: async bytes => {
      if (!Array.isArray(bytes) || bytes.length > MAX_GLB) throw new Error('Invalid model export.');
      const buffer = Buffer.from(bytes);inspectGLB(buffer);
      const selected = await dialog.showSaveDialog(getWindow(),{ title:'Export Orbit character', defaultPath:'Toggle-Orbit.glb',filters:[{name:'3D character',extensions:['glb']}] });
      if (selected.canceled) return false;await fs.writeFile(selected.filePath,buffer);return true;
    },
    action: async (name,args={}) => {
      if (!['save_note','list_notes','preview_downloads','draft_email','read_inbox','read_calendar'].includes(name)) throw new Error('Unsupported studio action');
      return service.tool(name,args);
    },
    approve: (id,edits) => service.approve(id,edits), cancel:id=>service.cancel(id),
    connect: async (id,secret) => { if (typeof id !== 'string' || typeof secret !== 'string' || id.length>300 || secret.length>300) throw new Error('Invalid credentials');if(!service.encryptedAvailable())throw new Error('OS credential encryption unavailable');await service.google.connect(id,secret);return service.state(); },
    disconnect:()=>service.disconnect(), configure:config=>service.configure(config), places:city=>service.findPlaces(city),
    notes:async()=>{ const p=path.join(service.directory,'notes');await fs.mkdir(p,{recursive:true});const error=await shell.openPath(p);if(error)throw new Error(error); },
    legacy:()=>{getBuddy()?.webContents.send('pf:settings');return true;},
    visibility:visible=>{if(typeof visible!=='boolean')throw new Error('Invalid visibility');visible?getBuddy()?.show():getBuddy()?.hide();return visible;}
  };
  const studioURL=pathToFileURL(path.join(__dirname,'../renderer/studio.html')).href;
  for (const [name,handler] of Object.entries(handlers)) ipcMain.handle('studio:'+name,async(event,...args)=>{
    try { const w=getWindow();if(!w || event.sender!==w.webContents || event.senderFrame!==w.webContents.mainFrame || event.senderFrame.url!==studioURL)throw new Error('Unauthorized studio request');return {ok:true,value:await handler(...args)}; }
    catch(e){return {ok:false,error:e.message};}
  });
  ipcMain.handle('pf:character',async event=>{
    const w=getBuddy();if(!w || event.sender!==w.webContents || event.senderFrame!==w.webContents.mainFrame)throw new Error('Unauthorized character request');return characterData();
  });
}
module.exports={registerStudio};
