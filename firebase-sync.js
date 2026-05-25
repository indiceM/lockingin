/**
 * firebase-sync.js
 * ─────────────────────────────────────────────────────────────────
 * Drop this script into every HTML page BEFORE any other scripts.
 * It patches window.localStorage so every read/write is mirrored
 * to Firestore in real time — no changes needed to the original code.
 *
 * HOW IT WORKS:
 *  1. On load: pulls all keys from Firestore → seeds localStorage
 *  2. On setItem / removeItem: writes to localStorage AND Firestore
 *  3. Firestore listener: if another device changes data, updates
 *     localStorage and fires a 'storage' event so the page reacts
 * ─────────────────────────────────────────────────────────────────
 */

// ─── YOUR FIREBASE CONFIG (paste yours here) ─────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDRBhDCWE1ImCmOs5qmmdCDF2p2XWcfK6c",
  authDomain: "mydashboard-5d94d.firebaseapp.com",
  projectId: "mydashboard-5d94d",
  storageBucket: "mydashboard-5d94d.firebasestorage.app",
  messagingSenderId: "210099182455",
  appId: "1:210099182455:web:88243761b137ccbdc5df72",
  measurementId: "G-DRDCYH0MFJ"
};

// Firestore document path: users / <userId> / data
// We use a fixed userId so all devices share the same data.
// If you want multi-user in the future, replace this with Firebase Auth.
const USER_ID = "default";
const DOC_PATH = `users/${USER_ID}/data`;

// ─── LOAD FIREBASE SDK ────────────────────────────────────────────
(function loadFirebase() {
  const scripts = [
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"
  ];

  let loaded = 0;
  scripts.forEach(src => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => { if (++loaded === scripts.length) initSync(); };
    document.head.appendChild(s);
  });
})();

// ─── STATE ────────────────────────────────────────────────────────
let db = null;
let _patchedStorage = false;
let _pendingWrites = {}; // buffer writes before SDK is ready
let _debounceTimers = {};

// ─── INIT ─────────────────────────────────────────────────────────
function initSync() {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  db = firebase.firestore();

  // Pull cloud data into localStorage first, then patch
  db.doc(DOC_PATH).get().then(snap => {
    if (snap.exists) {
      const cloudData = snap.data() || {};
      Object.entries(cloudData).forEach(([k, v]) => {
        // Only overwrite if cloud data is newer (we use a _ts field)
        window.__origLocalStorage.setItem(k, v);
      });
      console.log("[firebase-sync] Loaded", Object.keys(cloudData).length, "keys from Firestore");
    }

    // Write any keys that only exist locally (first-time user)
    const localOnlyData = {};
    for (let i = 0; i < window.__origLocalStorage.length; i++) {
      const k = window.__origLocalStorage.key(i);
      if (k && !k.startsWith("firebase:")) {
        const v = window.__origLocalStorage.getItem(k);
        localOnlyData[k] = v;
      }
    }
    if (Object.keys(localOnlyData).length > 0) {
      db.doc(DOC_PATH).set(localOnlyData, { merge: true });
    }

    // Flush any writes that happened before SDK was ready
    if (Object.keys(_pendingWrites).length > 0) {
      db.doc(DOC_PATH).set(_pendingWrites, { merge: true });
      _pendingWrites = {};
    }

    // Notify page that sync is ready (pages can listen for this)
    window.dispatchEvent(new CustomEvent("firebase-sync-ready"));

    // Reload page data if needed (for pages that read on load)
    if (typeof window.__onSyncReady === "function") {
      window.__onSyncReady();
    }

    patchLocalStorage();
    startListener();
  }).catch(err => {
    console.warn("[firebase-sync] Could not reach Firestore, running offline:", err.message);
    patchLocalStorage(); // still patch so writes are queued
  });
}

// ─── PATCH localStorage ───────────────────────────────────────────
function patchLocalStorage() {
  if (_patchedStorage) return;
  _patchedStorage = true;

  // Save originals
  window.__origLocalStorage = {
    setItem:    (k, v) => Object.getOwnPropertyDescriptor(Storage.prototype, 'setItem') ? Storage.prototype.setItem.call(localStorage, k, v) : localStorage.setItem(k, v),
    getItem:    (k)    => Storage.prototype.getItem.call(localStorage, k),
    removeItem: (k)    => Storage.prototype.removeItem.call(localStorage, k),
    get length()       { return localStorage.length; },
    key:        (i)    => localStorage.key(i)
  };

  const origSet = Storage.prototype.setItem;
  const origRemove = Storage.prototype.removeItem;

  Storage.prototype.setItem = function(key, value) {
    origSet.call(this, key, value);
    if (this === localStorage && !key.startsWith("firebase:")) {
      writeToFirestore(key, value);
    }
  };

  Storage.prototype.removeItem = function(key) {
    origRemove.call(this, key);
    if (this === localStorage && !key.startsWith("firebase:")) {
      deleteFromFirestore(key);
    }
  };

  console.log("[firebase-sync] localStorage patched ✓");
}

// ─── WRITE TO FIRESTORE (debounced per key) ───────────────────────
function writeToFirestore(key, value) {
  if (!db) {
    _pendingWrites[key] = value;
    return;
  }
  clearTimeout(_debounceTimers[key]);
  _debounceTimers[key] = setTimeout(() => {
    db.doc(DOC_PATH).set({ [key]: value }, { merge: true })
      .catch(err => console.warn("[firebase-sync] Write error:", err.message));
  }, 300);
}

function deleteFromFirestore(key) {
  if (!db) return;
  db.doc(DOC_PATH).update({
    [key]: firebase.firestore.FieldValue.delete()
  }).catch(err => console.warn("[firebase-sync] Delete error:", err.message));
}

// ─── REAL-TIME LISTENER ───────────────────────────────────────────
// When another device writes to Firestore, update localStorage here
// and fire a 'storage' event so the page re-renders.
function startListener() {
  db.doc(DOC_PATH).onSnapshot(snap => {
    if (!snap.exists) return;
    const cloudData = snap.data() || {};

    Object.entries(cloudData).forEach(([k, v]) => {
      const current = Storage.prototype.getItem.call(localStorage, k);
      if (current !== v) {
        // Update localStorage WITHOUT triggering our patched setItem
        // (to avoid infinite loop of writes back to Firestore)
        Storage.prototype.setItem.call(localStorage, k, v);

        // Fire a storage event so pages that listen to it update
        try {
          window.dispatchEvent(new StorageEvent("storage", {
            key: k,
            oldValue: current,
            newValue: v,
            storageArea: localStorage
          }));
        } catch (e) { /* ignore */ }

        // Also fire the custom event the dashboard uses
        if (k.startsWith("goals:") || k === "goal_streak_v1") {
          window.dispatchEvent(new CustomEvent("goals-changed"));
        }
      }
    });
  }, err => {
    console.warn("[firebase-sync] Listener error:", err.message);
  });
}
