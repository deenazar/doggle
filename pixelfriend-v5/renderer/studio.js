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
  character: ['Character studio', 'Desktop companion', 'Preview your character and adjust how it behaves on your desktop.'],
  reminders: ['Reminders', 'Reminders', 'Set your intervals, daily goal and quiet hours.'],
  connections: ['Connections', 'Connections', 'Manage your Google account and weather alerts.'],
  tools: ['Files & notes', 'Files & notes', 'Write a note, sort Downloads or review an email draft.']
 };
 const [crumb,title,subtitle]=titles[name];$('breadcrumb').textContent=crumb;$('pageTitle').textContent=title;$('pageSubtitle').textContent=subtitle;
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
for (const button of moodButtons) {
  button.addEventListener('click', () => {
    previewImage.src = 'avatars/' + button.dataset.mood + '.webp';
    previewImage.alt = 'Original character preview: ' + button.textContent;
    for (const moodButton of moodButtons) {
      moodButton.setAttribute('aria-pressed', String(moodButton === button));
    }
  });
}

function readCharacterPreferences(){const c={name:$('buddyName').value,accent:$('accent').value,style:$('bubbleStyle').value};for(const k of ['size','speed'])c[k]=Number($(k).value);for(const k of ['roam','lap','come','sound','meter'])c[k]=$(k).checked;return c;}
function fillPreferences(s){for(const k of numeric)if(s[k]!=null)$(k).value=s[k];for(const k of booleans)$(k).checked=!!s[k];$('buddyName').value=s.name||'';$('accent').value=s.accent||'#2563eb';$('bubbleStyle').value=s.style||'float';$('customText').value=s.customText||'';updateLabels();}
function updateLabels() {
  $('sizeOutput').textContent = $('size').value + ' px';
  $('speedOutput').textContent = $('speed').value + '×';
  previewImage.style.setProperty('--avatar-scale', Number($('size').value) / 220);
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
$('toggleVisibility').onclick=()=>run($('toggleVisibility'),async()=>{visible=await window.studio.visibility(!visible);$('toggleVisibility').setAttribute('aria-label',visible?'Hide desktop companion':'Show desktop companion');toast(visible?'Desktop companion shown':'Desktop companion hidden');});
$('legacyAppearance').onclick=()=>run(null,()=>window.studio.legacy());
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
for (const id of ['openGuide', 'guideTop']) {
  $(id).onclick = () => $('guide').showModal();
}
$('closeGuide').onclick = () => $('guide').close();
$('openCharacterEditor').onclick = () => run($('openCharacterEditor'), async () => {
  await window.studio.legacy();
  $('guide').close();
});

(async () => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => $('splash').classList.add('finished'), reducedMotion ? 100 : 1250);
  try {
    state = await window.studio.state();
    fillPreferences(state.desktop);
    fillConnection(state.agent);
  } catch (error) {
    toast('Studio could not load: ' + error.message, true);
  }
})();
