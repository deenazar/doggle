'use strict';
const $=id=>document.getElementById(id);
let state, visible = true, toastTimer;
const numeric=['size','speed','interval','goal','qs','qe','eyesMin','stretchMin','postureMin','customMin','snooze'];
const booleans=['roam','lap','come','sound','meter','eyesOn','stretchOn','postureOn','customOn','notify'];
function toast(message,error=false){$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,error?12000:4500);}
async function run(button,work){if(button)button.disabled=true;try{return await work();}catch(e){toast(e.message,true);}finally{if(button)button.disabled=false;}}
function page(name){
 const character = name === 'character';
 for(const id of ['character','reminders','connections','tools'])$(id+'Page').hidden=id==='character'?!character:id!==name;
 document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===name);if(b.dataset.page===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 const titles = {
  character: ['Desktop companion', 'Preview animations and make the character yours.'],
  reminders: ['Reminders', 'Set your intervals, daily goal and quiet hours.'],
  connections: ['Connections', 'Manage your Google account and weather alerts.'],
  tools: ['Files & notes', 'Write a note, sort Downloads or review an email draft.']
 };
 const [title,subtitle]=titles[name];$('pageTitle').textContent=title;$('pageSubtitle').textContent=subtitle;
}

document.querySelectorAll('[data-page]').forEach(button => {
  button.onclick = () => page(button.dataset.page);
});
document.querySelector('.brand').onclick = event => {
  event.preventDefault();
  page('character');
};

const previewImage = $('originalPreview');
const moodButtons = document.querySelectorAll('[data-mood]');
const contexts = {
 idle: 'கேரக்டர் சும்மா இருக்கும்போது',
 walk: 'கேரக்டர் நடக்கும்போது',
 happy: 'தண்ணீர் குடித்ததைப் பதிவு செய்து கேரக்டர் சந்தோஷப்படும்போது',
 sleep: 'அமைதி நேரத்தில் கேரக்டர் தூங்கும்போது',
 ask: 'கேரக்டர் நினைவூட்டல் கேட்கும்போது',
 held: 'கேரக்டரைப் பிடித்துத் தூக்கும்போது'
};
let selectedMood = 'idle', previewURL, revision = 0;
let portraitURL, portraitRevision = 0;
async function showPortrait() {
 const current = ++portraitRevision;
 const file = await window.characterImages.read('idle');
 if (current !== portraitRevision) return;
 if (portraitURL) URL.revokeObjectURL(portraitURL);
 portraitURL = file ? URL.createObjectURL(file) : null;
 const isVideo = !!file?.type.startsWith('video/');
 const video = $('portraitVideo');
 video.hidden = !isVideo;
 $('portraitImage').hidden = isVideo;
 if (isVideo) video.src = portraitURL;
 else {
   video.pause(); video.removeAttribute('src'); video.load();
   $('portraitImage').src = portraitURL || 'avatars/idle.webp';
 }
}
async function previewMood(mood) {
 selectedMood = mood;
 const current = ++revision;
 const button = Array.from(moodButtons).find(item => item.dataset.mood === mood);
 for (const item of moodButtons) item.setAttribute('aria-pressed', String(item === button));
 $('previewMood').textContent = button.textContent.trim();
 $('imageContext').textContent = contexts[mood] + ' இந்தப் படம் தெரியும்.';
 $('pictureStatus').textContent = '';
 const file = await window.characterImages.read(mood);
 if (current !== revision) return;
 const video = $('videoPreview');
 video.pause();
 video.removeAttribute('src');
 video.load();
 if (previewURL) URL.revokeObjectURL(previewURL);
 previewURL = file ? URL.createObjectURL(file) : null;
 const isVideo = !!file?.type.startsWith('video/');
 previewImage.hidden = isVideo;
 video.hidden = !isVideo;
 if (isVideo) video.src = previewURL;
 else {
   previewImage.src = previewURL || 'avatars/' + mood + '.webp';
   previewImage.alt = $('previewMood').textContent + ' character image';
 }
 $('restorePicture').hidden = !file;
}
for (const button of moodButtons) button.onclick = () => run(null, () => previewMood(button.dataset.mood));
window.characterImages.onChange(mood => {
 if (mood === 'idle') run(null, showPortrait);
 if (mood === selectedMood) run(null, () => previewMood(mood));
});
run(null, showPortrait);
run(null, () => previewMood('idle'));
let fileMood;
$('choosePicture').onclick = () => { fileMood = selectedMood; $('pictureFile').click(); };
async function applyPicture(mood, file) {
 await window.characterImages.save(mood, file);
 if (mood === 'idle') await showPortrait();
 if (selectedMood !== mood) return;
 await previewMood(mood);
 if (selectedMood === mood) $('pictureStatus').textContent = file ? 'படம் சேமிக்கப்பட்டது. ' + contexts[mood] + ' தெரியும்.' : 'பழைய கேரக்டர் மீண்டும் அமைக்கப்பட்டது.';
}
$('pictureFile').onchange = () => run($('choosePicture'), async () => {
 const file = $('pictureFile').files[0];
 const mood = fileMood;
 $('pictureFile').value = '';
 if (!file) return;
 if (!['image/png','image/jpeg','image/gif','image/webp','video/webm','video/mp4','video/quicktime'].includes(file.type))
   throw new Error('Choose a PNG, JPEG, GIF, WebP, MP4, WebM or MOV file.');
 const url = URL.createObjectURL(file);
 try {
   if (file.type.startsWith('image/')) {
     const image = new Image(); image.src = url; await image.decode();
   } else {
     const video = document.createElement('video');
     video.preload = 'metadata';
     await new Promise((resolve, reject) => {
       video.onloadedmetadata = resolve; video.onerror = reject; video.src = url;
     });
     video.removeAttribute('src'); video.load();
   }
 } catch { throw new Error('This file could not be opened. Try another image or video.'); }
 finally { URL.revokeObjectURL(url); }
 await applyPicture(mood, file);
});
$('restorePicture').onclick = () => run($('restorePicture'), () => applyPicture(selectedMood, null));
function focusImageEditor() {
 page('character');
 $('choosePicture').focus();
 $('choosePicture').scrollIntoView({ block: 'center' });
}
$('guideTop').onclick = focusImageEditor;

function readCharacterPreferences(){const c={name:$('buddyName').value,accent:$('accent').value,style:$('bubbleStyle').value};for(const k of ['size','speed'])c[k]=Number($(k).value);for(const k of ['roam','lap','come','sound','meter'])c[k]=$(k).checked;return c;}
function fillPreferences(s){for(const k of numeric)if(s[k]!=null)$(k).value=s[k];for(const k of booleans)$(k).checked=!!s[k];$('buddyName').value=s.name||'';$('accent').value=s.accent||'#2563eb';$('bubbleStyle').value=s.style||'float';$('customText').value=s.customText||'';updateLabels();}
function updateLabels() {
  $('sizeOutput').textContent = $('size').value + ' px';
  $('speedOutput').textContent = $('speed').value + '×';
  $('stage').style.setProperty('--avatar-scale', Number($('size').value) / 220);
}
$('size').oninput = updateLabels;
$('speed').oninput = updateLabels;

document.querySelectorAll('[data-color]').forEach(button => {
  button.onclick = () => { $('accent').value = button.dataset.color; };
});

$('applyCharacter').onclick = () => run($('applyCharacter'), async () => {
  await window.studio.preferences(readCharacterPreferences());
  $('saveHint').textContent = 'Desktop settings saved.';
  toast('Desktop settings saved.');
});
function updateVisibility(visibleOnDesktop) {
  visible = visibleOnDesktop;
  $('visibilityLabel').textContent = visible ? 'Hide on desktop' : 'Show on desktop';
}

$('toggleVisibility').onclick = () => run($('toggleVisibility'), async () => {
  updateVisibility(await window.studio.visibility(!visible));
});
$('legacyAppearance').onclick=()=>run(null,()=>window.studio.legacy());
$('saveReminders').onclick=()=>run($('saveReminders'),async()=>{const c={customText:$('customText').value};for(const k of numeric.filter(k=>!['size','speed'].includes(k)))c[k]=Number($(k).value);for(const k of ['eyesOn','stretchOn','postureOn','customOn','notify'])c[k]=$(k).checked;await window.studio.preferences(c);toast('Your reminder rhythm is saved.');});
function fillConnection(agent){state.agent=agent;$('googleStatus').textContent=agent.connected?'Connected to Google':'Guest';
 $('connectGoogle').hidden=agent.connected;
 $('disconnectGoogle').hidden=!agent.connected;
 $('googleNotifications').disabled=!agent.connected;
 $('googleNotifications').checked=agent.config.notifications;$('weatherAlerts').checked=agent.config.weatherAlerts;$('heatThreshold').value=agent.config.heatThreshold;const p=agent.config.location;if(p){const o=document.createElement('option');o.value=String(p.id);o.textContent=`${p.name}, ${p.admin1||''}, ${p.country}`;$('weatherPlace').replaceChildren(o);}}
const welcome = $('welcome');
let signingIn = null;
function rememberGuest() {
  localStorage.setItem('toggleGuest', '1');
  if (welcome.open) welcome.close();
}
async function enterAsGuest() {
  if (signingIn) {
    $('welcomeGuest').disabled = true;
    try {
      await window.studio.cancelSignIn();
      await signingIn;
    } finally { $('welcomeGuest').disabled = false; }
    if (state.agent.connected) return;
  }
  rememberGuest();
}
function signIn() {
  if (signingIn) return signingIn;
  $('welcomeGoogle').disabled = $('connectGoogle').disabled = true;
  $('welcomeStatus').textContent = 'Choose your Google account in your browser.';
  if (!welcome.open) toast($('welcomeStatus').textContent);
  signingIn = (async () => {
    try {
      const agent = await window.studio.connect();
      fillConnection(agent);
      localStorage.removeItem('toggleGuest');
      if (welcome.open) welcome.close();
      toast('Gmail and Calendar connected.');
    } catch (error) {
      if (welcome.open) $('welcomeStatus').textContent = error.message;
      else toast(error.message, true);
    } finally {
      $('welcomeGoogle').disabled = $('connectGoogle').disabled = false;
      signingIn = null;
    }
  })();
  return signingIn;
}
$('welcomeGoogle').onclick = $('connectGoogle').onclick = signIn;
$('welcomeGuest').onclick = () => run(null, enterAsGuest);
welcome.addEventListener('cancel', event => {
  event.preventDefault();
  run(null, enterAsGuest);
});
$('disconnectGoogle').onclick = () => run($('disconnectGoogle'), async () => {
  fillConnection(await window.studio.disconnect());
  rememberGuest();
  await refreshApprovals();
  toast('You are using Toggle as a guest.');
});
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
$('openGuide').onclick = () => $('guide').showModal();
$('closeGuide').onclick = () => $('guide').close();
$('openCharacterEditor').onclick = () => { $('guide').close(); focusImageEditor(); };

(async () => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const splashDelay = new Promise(resolve => setTimeout(resolve, reducedMotion ? 100 : 1250));
  try {
    state = await window.studio.state();
    fillPreferences(state.desktop);
    updateVisibility(state.visible ?? true);
    fillConnection(state.agent);
    await splashDelay;
    if (!state.agent.connected && !localStorage.getItem('toggleGuest')) welcome.showModal();
  } catch (error) {
    toast('Studio could not load: ' + error.message, true);
  } finally { $('splash').classList.add('finished'); }
})();
