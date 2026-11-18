'use strict';
const $=id=>document.getElementById(id);
let viewer,state,previewKind='starter',previewReady=false,visible=true,toastTimer,loadSerial=0;
const numeric=['size','speed','interval','goal','qs','qe','eyesMin','stretchMin','postureMin','customMin','snooze'];
const booleans=['roam','lap','come','sound','meter','eyesOn','stretchOn','postureOn','customOn','notify'];
function toast(message,error=false){$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,error?12000:4500);}
async function run(button,work){if(button)button.disabled=true;try{return await work();}catch(e){toast(e.message,true);}finally{if(button)button.disabled=false;}}
function page(name){
 const character=['home','character'].includes(name);
 for(const id of ['character','reminders','connections','tools'])$(id+'Page').hidden=id==='character'?!character:id!==name;
 document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===name);if(b.dataset.page===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 const titles = {
  home: ['Overview', 'Character workshop', 'Preview movement and customize your desktop companion.'],
  character: ['Character studio', 'Character studio', 'Choose Orbit, the original avatar, or your own GLB.'],
  reminders: ['Reminders', 'Reminders', 'Set your intervals, daily goal and quiet hours.'],
  connections: ['Connections', 'Connections', 'Manage your Google account and weather alerts.'],
  tools: ['Files & notes', 'Files & notes', 'Write a note, sort Downloads or review an email draft.']
 };
 const [crumb,title,subtitle]=titles[name];$('breadcrumb').textContent=crumb;$('pageTitle').textContent=title;$('pageSubtitle').textContent=subtitle;
 requestAnimationFrame(()=>viewer?.resize());
}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>page(b.dataset.page));document.querySelector('.brand').onclick=e=>{e.preventDefault();page('home');};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function drawPlayhead(action) {
  if (!action || $('motionInspector').hidden) return;
  const duration = action.getClip().duration;
  const progress = Math.min(1, action.time / duration);
  const seconds = action.time.toFixed(2);
  const seek = $('motionSeek');
  seek.value = Math.round(progress * 1000);
  seek.setAttribute('aria-valuetext', seconds + ' seconds');
  $('motionTrace').style.strokeDasharray = progress + ' 1';
  $('motionTime').textContent = seconds + ' s';
}

function updatePlayback(paused) {
  const label = paused ? 'Play animation' : 'Pause animation';
  $('motionPlayback').setAttribute('aria-label', label);
  $('motionPlayback').title = label;
  $('motionGlyph').setAttribute('d', paused ? 'M9 5l10 7-10 7z' : 'M9 5v14m6-14v14');
}

function refreshTimeline() {
  const action = viewer?.action;
  const clip = action?.getClip();
  const hasTimeline = !$('modelCanvas').hidden && clip?.duration > 0;
  $('motionInspector').hidden = !hasTimeline;
  $('previewStatus').textContent = $('modelCanvas').hidden ? 'Animated avatar' : '3D preview';
  if (!hasTimeline) return;
  const keyframes = new Set();
  for (const track of clip.tracks) {
    for (const time of track.times) {
      const position = Math.min(419, Math.max(1, Math.round(time / clip.duration * 420)));
      keyframes.add(position);
    }
  }
  $('motionFrames').setAttribute('d', [...keyframes].map(x => 'M' + x + ' 20v7').join(''));
  $('motionDuration').textContent = clip.duration.toFixed(2) + ' s';
  action.paused = reducedMotion.matches;
  updatePlayback(action.paused);
  drawPlayhead(action);
}

function ensureViewer() {
  if (!viewer) {
    viewer = new window.ToggleModelView($('modelCanvas'), { interactive: true });
    viewer.onFrame = drawPlayhead;
  }
  return viewer;
}

$('motionSeek').addEventListener('input', event => {
  const action = viewer?.action;
  if (!action) return;
  viewer.seek(Number(event.target.value) / 1000 * action.getClip().duration);
  updatePlayback(true);
  drawPlayhead(action);
});

$('motionPlayback').addEventListener('click', () => {
  const action = viewer?.action;
  if (!action) return;
  action.paused = !action.paused;
  updatePlayback(action.paused);
});

reducedMotion.addEventListener('change', event => {
  if (event.matches && viewer?.action) {
    viewer.action.paused = true;
    updatePlayback(true);
  }
});
async function preview(kind,data){
 const serial=++loadSerial;previewReady=false;$('motionInspector').hidden=true;$('applyCharacter').disabled=true;$('previewError').hidden=true;
 try{
  if(kind==='original'){$('modelCanvas').hidden=true;$('originalPreview').hidden=false;$('animation').replaceChildren();$('animation').disabled=true;}
  else{
   $('modelCanvas').hidden=false;$('originalPreview').hidden=true;const v=ensureViewer();const clips=await v.load(data?.bytes || null);if(serial!==loadSerial)return;
   $('animation').replaceChildren(...(clips.length?clips:['Static model']).map(name=>{const o=document.createElement('option');o.textContent=name;o.value=name;return o;}));$('animation').disabled=!clips.length;
   v.setRotation(Number($('rotation').value));
  }
  if(serial!==loadSerial)return;previewKind=kind;previewReady=true;
  if (viewer?.action && kind !== 'original') {
    $('animation').value = viewer.action.getClip().name;
  }
  refreshTimeline();
  $('previewName').textContent=kind==='starter'?'Orbit':kind==='original'?'Original companion':data.name;
  $('previewDescription').textContent=kind==='custom'?'Your own 3D character':kind==='original'?'Original animated avatar':'Built-in 3D character';
  $('chooseStarter').classList.toggle('selected',kind==='starter');$('chooseOriginal').classList.toggle('selected',kind==='original');$('uploadModel').classList.toggle('selected',kind==='custom');
 }catch(e){if(serial===loadSerial){$('previewError').hidden=false;$('previewError').textContent='Could not preview this model. '+e.message;toast('The current desktop character has not changed.',true);}}
 finally{if(serial===loadSerial)$('applyCharacter').disabled=!previewReady;}
}
function readCharacterPreferences(){const c={name:$('buddyName').value,accent:$('accent').value,style:$('bubbleStyle').value};for(const k of ['size','speed'])c[k]=Number($(k).value);for(const k of ['roam','lap','come','sound','meter'])c[k]=$(k).checked;return c;}
function fillPreferences(s){for(const k of numeric)if(s[k]!=null)$(k).value=s[k];for(const k of booleans)$(k).checked=!!s[k];$('buddyName').value=s.name||'';$('accent').value=s.accent||'#2563eb';$('bubbleStyle').value=s.style||'float';$('customText').value=s.customText||'';updateLabels();}
function updateLabels(){$('sizeOutput').textContent=$('size').value+' px';$('speedOutput').textContent=$('speed').value+'×';$('rotationOutput').textContent=$('rotation').value+'°';}
$('size').oninput=()=>{updateLabels();if(viewer){viewer.camera.position.set(0,1.25,5.7*220/Number($('size').value));viewer.controls?.update();}};$('speed').oninput=updateLabels;$('rotation').oninput=()=>{updateLabels();viewer?.setRotation(Number($('rotation').value));};
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{$('accent').value=b.dataset.color;});
$('chooseStarter').onclick=()=>preview('starter');$('chooseOriginal').onclick=()=>preview('original');
async function upload(){await run($('uploadModel'),async()=>{const data=await window.studio.upload();if(data)await preview('custom',data);});}
$('uploadModel').onclick=upload;$('animation').onchange = () => {
  viewer?.play($('animation').value);
  refreshTimeline();
};
$('resetView').onclick=()=>{if(viewer){viewer.camera.position.set(0,1.25,5.7);viewer.controls.target.set(0,1.15,0);viewer.controls.update();}$('rotation').value=0;viewer?.setRotation(0);updateLabels();};
$('applyCharacter').onclick=()=>run($('applyCharacter'),async()=>{
 if(!previewReady)throw new Error('Preview a character before applying.');
 await window.studio.preferences(readCharacterPreferences());const active=await window.studio.activate({kind:previewKind,rotation:Number($('rotation').value)});
 $('activeCharacter').textContent='On desktop: '+active.name;$('saveHint').textContent='Saved. Your desktop companion is up to date.';toast('Your companion is ready. Say hello!');
});
$('toggleVisibility').onclick=()=>run($('toggleVisibility'),async()=>{visible=await window.studio.visibility(!visible);$('toggleVisibility').setAttribute('aria-label',visible?'Hide desktop companion':'Show desktop companion');toast(visible?'Desktop companion shown':'Desktop companion hidden');});
$('legacyAppearance').onclick=()=>run(null,()=>window.studio.legacy());$('goReminders').onclick=()=>page('reminders');
$('saveReminders').onclick=()=>run($('saveReminders'),async()=>{const c={customText:$('customText').value};for(const k of numeric.filter(k=>!['size','speed'].includes(k)))c[k]=Number($(k).value);for(const k of ['eyesOn','stretchOn','postureOn','customOn','notify'])c[k]=$(k).checked;await window.studio.preferences(c);toast('Your reminder rhythm is saved.');});
function fillConnection(agent){state.agent=agent;$('googleStatus').textContent=agent.connected?'Connected to Google':'Not connected';$('googleNotifications').checked=agent.config.notifications;$('weatherAlerts').checked=agent.config.weatherAlerts;$('heatThreshold').value=agent.config.heatThreshold;const p=agent.config.location;if(p){const o=document.createElement('option');o.value=String(p.id);o.textContent=`${p.name}, ${p.admin1||''}, ${p.country}`;$('weatherPlace').replaceChildren(o);}}
$('connectGoogle').onclick=()=>run($('connectGoogle'),async()=>{if(!$('clientId').value.trim()||!$('clientSecret').value.trim()){document.querySelector('.oauth-details').open=true;$('clientId').focus();throw new Error('Enter your Google Desktop OAuth client details in Google setup first.');}toast('Finish Google sign-in in your browser.');try{fillConnection(await window.studio.connect($('clientId').value.trim(),$('clientSecret').value.trim()));toast('Google connected.');}finally{$('clientSecret').value='';}});
$('disconnectGoogle').onclick=()=>run($('disconnectGoogle'),async()=>{fillConnection(await window.studio.disconnect());await refreshApprovals();toast('Google disconnected locally.');});
$('searchCity').onclick=()=>run($('searchCity'),async()=>{const places=await window.studio.places($('weatherCity').value.trim());$('weatherPlace').replaceChildren(...places.map(p=>{const o=document.createElement('option');o.value=String(p.id);o.textContent=`${p.name}, ${p.admin1||''}, ${p.country}`;return o;}));toast(places.length?'Choose your location, then save connections.':'No places found. Try the English city name.');});
$('saveConnections').onclick=()=>run($('saveConnections'),async()=>{const next=await window.studio.configure({model:state.agent.config.model,notifications:$('googleNotifications').checked,weatherAlerts:$('weatherAlerts').checked,heatThreshold:Number($('heatThreshold').value),placeId:$('weatherPlace').value});fillConnection(next);toast('Connections and alerts saved.');});
for(const b of document.querySelectorAll('[data-tool]'))b.onclick=()=>{for(const n of ['notes','files','email'])$(n+'Tool').hidden=n!==b.dataset.tool;};
function results(items){$('toolResults').replaceChildren();for(const item of items){const el=document.createElement('article');el.className='tool-result';el.textContent=typeof item==='string'?item:Object.entries(item).map(([k,v])=>`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join('\n');$('toolResults').append(el);}}
$('saveNote').onclick=()=>run($('saveNote'),async()=>{const r=await window.studio.action('save_note',{title:$('noteTitle').value,body:$('noteBody').value});toast('Note saved: '+r.title);$('noteTitle').value='';$('noteBody').value='';});
$('listNotes').onclick=()=>run($('listNotes'),async()=>{const notes=await window.studio.action('list_notes');results(notes.length?notes.map(n=>n.text):['No notes yet. Your first thought belongs here.']);});$('openNotes').onclick=()=>run(null,()=>window.studio.notes());
$('previewDownloads').onclick=()=>run($('previewDownloads'),async()=>{const r=await window.studio.action('preview_downloads');await refreshApprovals();if(r.status!=='awaiting_user_approval')toast(r.status);});
$('prepareEmail').onclick=()=>run($('prepareEmail'),async()=>{await window.studio.action('draft_email',{to:$('emailTo').value.trim(),subject:$('emailSubject').value,body:$('emailBody').value});await refreshApprovals();toast('Draft ready. Review before sending.');});
$('readCalendar').onclick=()=>run($('readCalendar'),async()=>{const items=await window.studio.action('read_calendar');results(items.length?items:['No upcoming events in the primary calendar.']);});$('readInbox').onclick=()=>run($('readInbox'),async()=>{const items=await window.studio.action('read_inbox');results(items.length?items:['No unread inbox messages.']);});
async function refreshApprovals(){const s=await window.studio.state();$('approvals').replaceChildren();for(const p of s.agent.pending){const card=document.createElement('section');card.className='approval';const title=document.createElement('h2');title.textContent=p.type==='email'?'Ready to send?':'Review these file moves';card.append(title);const edits={};
 if(p.type==='email'){for(const [key,labelText]of [['to','Recipient'],['subject','Subject'],['body','Message']]){const label=document.createElement('label');label.textContent=labelText;const input=document.createElement(key==='body'?'textarea':'input');if(key==='body')input.rows=5;input.value=p.details[key];label.append(input);card.append(label);edits[key]=input;}}
 else{const list=document.createElement('ul');for(const m of p.details.moves){const li=document.createElement('li');li.textContent=`${m.name} → ${m.folder}/${m.name}`;list.append(li);}card.append(list);}
 const approve=document.createElement('button');approve.className='button primary';approve.textContent=p.type==='email'?'Approve & send email':'Approve & move files';const cancel=document.createElement('button');cancel.className='button secondary';cancel.textContent='Cancel';
 approve.onclick=()=>run(approve,async()=>{cancel.disabled=true;try{const r=await window.studio.approve(p.id,p.type==='email'?Object.fromEntries(Object.entries(edits).map(([k,v])=>[k,v.value])):undefined);results([p.type==='email'?'Email sent. Gmail ID: '+r.id:`Moved ${r.moved.length} files. Skipped ${r.skipped.length}.`,...(r.skipped||[])]);}finally{await refreshApprovals();}});cancel.onclick=()=>run(cancel,async()=>{await window.studio.cancel(p.id);await refreshApprovals();});card.append(approve,cancel);$('approvals').append(card);}}
function guide(){$('guide').showModal();}for(const id of ['openGuide','guideTop','buildOwn'])$(id).onclick=guide;$('closeGuide').onclick=()=>$('guide').close();$('guideUpload').onclick=()=>{$('guide').close();page('character');upload();};
$('exportStarter').onclick=()=>run($('exportStarter'),async()=>{const bytes=await ensureViewer().exportStarter();if(await window.studio.export(Array.from(new Uint8Array(bytes))))toast('Orbit exported as an animated GLB.');});
(async()=>{
 const splash=setTimeout(()=>$('splash').classList.add('finished'),matchMedia('(prefers-reduced-motion: reduce)').matches?100:1700);
 try{state=await window.studio.state();fillPreferences(state.desktop);fillConnection(state.agent);$('rotation').value=state.character.rotation||0;updateLabels();$('activeCharacter').textContent='On desktop: '+state.character.name;
  if(state.character.kind==='custom')await preview('custom',await window.studio.character());else await preview('starter');
 }catch(e){toast('Studio could not load: '+e.message,true);$('previewError').textContent=e.message;$('previewError').hidden=false;}
})();
