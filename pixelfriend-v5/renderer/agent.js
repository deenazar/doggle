'use strict';
const $ = id => document.getElementById(id);
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function addMessage(role, text) { const el = document.createElement('article'); el.className = role; el.textContent = text; $('conversation').append(el); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
function render(state) {
  $('connection').textContent = state.connected ? 'Google connected' : 'Google not connected';
  $('weatherAlerts').checked = state.config.weatherAlerts;
  $('heatThreshold').value = state.config.heatThreshold;
  if (state.config.location) {
    const p = state.config.location;
    if (![...$('place').options].some(o => o.value === String(p.id))) { const o = document.createElement('option'); o.value = String(p.id); o.textContent = `${p.name}, ${p.admin1 || ''}, ${p.country}`; $('place').append(o); }
    $('place').value = String(p.id);
  }
  $('model').value = state.config.model; $('notifications').checked = state.config.notifications;
  $('approvals').replaceChildren();
  for (const item of state.pending) {
    const card = document.createElement('div'); card.className = 'approval';
    const heading = document.createElement('h3'); heading.textContent = item.type === 'email' ? 'Email draft — உங்கள் approval தேவை' : 'Downloads preview — உங்கள் approval தேவை'; card.append(heading);
    const inputs = {};
    if (item.type === 'email') {
      for (const [key, title] of [['to','To'],['subject','Subject'],['body','Message']]) {
        const label = document.createElement('label'); label.textContent = title;
        const input = document.createElement(key === 'body' ? 'textarea' : 'input');
        input.value = item.details[key]; if (key === 'body') input.rows = 7;
        input.setAttribute('aria-label', title); label.append(input); card.append(label); inputs[key] = input;
      }
    } else {
      const p = document.createElement('p'); p.textContent = item.details.root + ' — ' + item.details.moves.length + ' files'; card.append(p);
      const list = document.createElement('ul');
      for (const move of item.details.moves) { const li = document.createElement('li'); li.textContent = `${move.name} → ${move.folder}/${move.name}`; list.append(li); } card.append(list);
    }
    const approve = document.createElement('button'); approve.textContent = item.type === 'email' ? 'Approve & send email' : 'Approve & move files';
    const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.className = 'secondary';
    approve.onclick = async () => {
      approve.disabled = cancel.disabled = true;
      try {
        const edits = item.type === 'email' ? Object.fromEntries(Object.entries(inputs).map(([k, input]) => [k, input.value])) : undefined;
        const result = await window.agent.approve(item.id, edits);
        addMessage('assistant', item.type === 'email' ? 'Email அனுப்பப்பட்டது. Gmail ID: ' + result.id : `${result.moved.length} files நகர்த்தப்பட்டன. ${result.skipped.length} skipped.\n` + result.skipped.map(s => `${s.name}: ${s.reason}`).join('\n'));
        status('Completed');
      } catch (e) { status(e.message, true); }
      finally { await refresh(); }
    };
    cancel.onclick = async () => { try { await window.agent.cancel(item.id); await refresh(); } catch (e) { status(e.message, true); } };
    card.append(approve, cancel); $('approvals').append(card);
  }
  if (state.pollError) status('Notification check: ' + state.pollError, true);
}
async function refresh() { try { render(await window.agent.state()); } catch (e) { status(e.message, true); } }
$('settingsToggle').onclick = () => { $('settings').hidden = !$('settings').hidden; };
$('checkModels').onclick = async () => { try { const models = await window.agent.models(); $('models').replaceChildren(...models.map(name => { const o = document.createElement('option'); o.value = name; return o; })); status(models.length ? 'Installed models: ' + models.join(', ') : 'No models installed. Run: ollama pull qwen3:4b'); } catch (e) { status(e.message, true); } };
$('searchCity').onclick = async () => {
  try {
    const places = await window.agent.places($('city').value.trim());
    $('place').replaceChildren(...places.map(p => { const o = document.createElement('option'); o.value = String(p.id); o.textContent = `${p.name}, ${p.admin1 || ''}, ${p.country}`; return o; }));
    status(places.length ? 'Select your location and save settings.' : 'No matching city found. Try its English spelling.');
  } catch (e) { status(e.message, true); }
};
$('save').onclick = async () => { try { render(await window.agent.configure({ model: $('model').value.trim(), notifications: $('notifications').checked, weatherAlerts: $('weatherAlerts').checked, heatThreshold: Number($('heatThreshold').value), placeId: $('place').value })); status('Settings saved'); } catch (e) { status(e.message, true); } };
$('connect').onclick = async () => {
  $('connect').disabled = true; status('Complete Google sign-in in your browser…');
  try { await window.agent.connect(); status('Google connected'); await refresh(); }
  catch (e) { status(e.message, true); }
  finally { $('connect').disabled = false; }
};
$('disconnect').onclick = async () => { try { render(await window.agent.disconnect()); status('Local credentials removed. Revoke access in your Google Account settings if desired.'); } catch (e) { status(e.message, true); } };
$('notes').onclick = async () => { try { await window.agent.notes(); } catch (e) { status(e.message, true); } };
$('chatForm').onsubmit = async event => {
  event.preventDefault(); const message = $('message').value.trim(); if (!message) return;
  $('send').disabled = true; $('message').value = ''; addMessage('user', message); status('Local AI யோசிக்கிறது…');
  try { const result = await window.agent.chat(message); addMessage('assistant', result.reply); render(result.state); status('Ready'); }
  catch (e) { status(e.message, true); await refresh(); }
  finally { $('send').disabled = false; $('message').focus(); }
};
refresh();
