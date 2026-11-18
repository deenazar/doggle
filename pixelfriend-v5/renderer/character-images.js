'use strict';

window.characterImages = (() => {
  // Keep the original database and keys so earlier desktop uploads remain available.
  const db = new Promise((resolve, reject) => {
    const request = indexedDB.open('pixelfriend', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('img');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const changes = new BroadcastChannel('toggle-character-images');
  async function transaction(mode, action) {
    const database = await db;
    return new Promise((resolve, reject) => {
      const tx = database.transaction('img', mode);
      const request = action(tx.objectStore('img'));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(tx.error || request.error);
    });
  }
  async function save(mood, file) {
    await transaction('readwrite', store => file ? store.put(file, mood) : store.delete(mood));
    changes.postMessage(mood);
  }
  return {
    read: mood => transaction('readonly', store => store.get(mood)),
    save,
    onChange: listener => changes.addEventListener('message', event => listener(event.data))
  };
})();
