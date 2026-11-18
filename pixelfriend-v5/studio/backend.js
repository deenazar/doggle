'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { validatePreferences } = require('./character');
function registerStudio({ ipcMain, shell, connectGoogle, cancelGoogle, getWindow, getBuddy, service }) {
  const buddy = async (method, value) => {
    const window = getBuddy();if (!window || window.isDestroyed()) throw new Error('Desktop companion is not ready.');
    return window.webContents.executeJavaScript(`window.toggleDesktop.${method}(${value === undefined ? '' : JSON.stringify(value)})`);
  };
  const handlers = {
    state: async () => ({ desktop: await buddy('getSettings'), agent: await service.state(), visible: getBuddy()?.isVisible() ?? false }),
    preferences: config => buddy('updateSettings',validatePreferences(config)),
    action: async (name,args={}) => {
      if (!['save_note','list_notes','preview_downloads','draft_email','read_inbox','read_calendar'].includes(name)) throw new Error('Unsupported studio action');
      return service.tool(name,args);
    },
    approve: (id,edits) => service.approve(id,edits), cancel:id=>service.cancel(id),
    connect: connectGoogle, cancelSignIn: cancelGoogle,
    disconnect:()=>service.disconnect(), configure:config=>service.configure(config), places:city=>service.findPlaces(city),
    notes:async()=>{ const p=path.join(service.directory,'notes');await fs.mkdir(p,{recursive:true});const error=await shell.openPath(p);if(error)throw new Error(error); },
    legacy: () => {
      const buddyWindow = getBuddy();
      if (!buddyWindow || buddyWindow.isDestroyed()) throw new Error('Desktop companion is not ready.');
      buddyWindow.show();
      buddyWindow.webContents.send('pf:settings');
    },
    visibility:visible=>{if(typeof visible!=='boolean')throw new Error('Invalid visibility');visible?getBuddy()?.show():getBuddy()?.hide();return visible;}
  };
  const studioURL=pathToFileURL(path.join(__dirname,'../renderer/studio.html')).href;
  for (const [name,handler] of Object.entries(handlers)) ipcMain.handle('studio:'+name,async(event,...args)=>{
    try { const w=getWindow();if(!w || event.sender!==w.webContents || event.senderFrame!==w.webContents.mainFrame || event.senderFrame.url!==studioURL)throw new Error('Unauthorized studio request');return {ok:true,value:await handler(...args)}; }
    catch(e){return {ok:false,error:e.message};}
  });

}
module.exports={registerStudio};
