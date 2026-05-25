// =============================================================
// Persistent dashboard top bar.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// It self-injects HTML + CSS, reads progress from the same
// localStorage keys the dashboard's tabs already use, and a
// water "+1" button writes to localStorage and (if configured)
// pushes a merged update to the Supabase health row so the
// new bottle appears on every device within ~1 second.
// =============================================================
(function () {
  'use strict';

  // -------- Supabase config (same project as the rest of the dashboard) --------
  // For your audience's standalone, replace these with placeholders
  // and have them paste their own values, just like the other pages.
  const TOPBAR_SUPABASE_URL = 'PASTE-YOUR-SUPABASE-PROJECT-URL-HERE';
  const TOPBAR_SUPABASE_KEY = 'PASTE-YOUR-SUPABASE-PUBLISHABLE-KEY-HERE';

  // -------- CSS --------
  const css = `
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 40;
  width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: max(18px, env(safe-area-inset-top)) 16px 18px;
  background: rgba(10, 10, 11, 0.94);
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.topbar-logo {
  width: 54px;
  height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: #F97316;
  background: rgba(249,115,22,0.10);
  border: 1px solid rgba(249,115,22,0.22);
  border-radius: 18px;
  box-shadow: 0 0 24px rgba(249,115,22,0.12);
}
.topbar-logo svg,
.topbar-icon svg {
  width: 24px;
  height: 24px;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.topbar-nav {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.topbar-item,
.topbar-water-wrap {
  position: relative;
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
}
.topbar-icon {
  position: relative;
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.62);
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.topbar-icon:hover {
  color: #FF8C32;
  background: rgba(249,115,22,0.10);
  border-color: rgba(249,115,22,0.24);
  box-shadow: 0 0 12px rgba(255, 140, 50, 0.6);
  transform: translateY(-1px);
}
.topbar-icon.active {
  color: #F97316;
  background: rgba(249,115,22,0.14);
  border-color: rgba(249,115,22,0.30);
}
.topbar-icon::after {
  content: attr(data-label);
  position: absolute;
  left: calc(100% + 14px);
  top: 50%;
  transform: translateY(-50%) translateX(-4px);
  opacity: 0;
  pointer-events: none;
  padding: 7px 10px;
  border-radius: 10px;
  background: rgba(14,14,16,0.96);
  border: 1px solid rgba(255,255,255,0.08);
  color: #FAFAFA;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.topbar-icon:hover::after {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}
.topbar-pill-count {
  position: absolute;
  right: -5px;
  bottom: -5px;
  min-width: 22px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 999px;
  background: #F97316;
  color: #fff;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: -0.04em;
  box-shadow: 0 4px 14px rgba(249,115,22,0.35);
}
.topbar-water-add {
  position: absolute;
  right: -6px;
  top: -6px;
  width: 22px;
  height: 22px;
  border: 1px solid rgba(249,115,22,0.36);
  background: linear-gradient(180deg, #FF8C32 0%, #F97316 100%);
  color: #FFFFFF;
  font-family: inherit;
  font-size: 15px;
  line-height: 1;
  font-weight: 800;
  cursor: pointer;
  border-radius: 999px;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.10s, box-shadow 0.18s;
  box-shadow: 0 4px 14px rgba(249,115,22,0.35);
}
.topbar-water-add:hover { box-shadow: 0 0 12px rgba(255, 140, 50, 0.6); }
.topbar-water-add:active { transform: scale(0.94); }
.topbar-water-add.flash { transform: scale(1.08); }
.topbar-pill-dot,
.topbar-pill-label { display: none; }
@keyframes topbar-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
}

@media (max-width: 720px) {
  .topbar {
    padding-left: 12px;
    padding-right: 12px;
  }
  .topbar-logo,
  .topbar-item,
  .topbar-water-wrap,
  .topbar-icon {
    width: 48px;
    height: 48px;
  }
  .topbar-icon svg,
  .topbar-logo svg { width: 22px; height: 22px; }
}

/* === Global mobile lockdown ===
   1) Hide the right-side scrollbar on phones (iOS uses overlay scrollbars anyway).
   2) Stop iOS auto-text-size-adjust.
   3) touch-action: pan-y prevents pinch-zoom while still allowing vertical scroll.
   4) overscroll-behavior on every common modal class stops scroll chaining —
      scrolling inside a settings popup won't drag the page behind it.
   5) When body has .topbar-modal-open, the page can't scroll at all (locked).
*/
html, body {
  -webkit-text-size-adjust: 100%;
}
@media (max-width: 768px) {
  html { touch-action: pan-y; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg, .modal, .po-modal-bg, .po-modal, .wt-overlay, .wt-viewer {
  overscroll-behavior: contain;
}
body.topbar-modal-open {
  overflow: hidden;
  touch-action: none;
}
/* On phones, blow the modals up to full screen and let them be the only
   scrolling element. Way less "is this scrolling the page or the modal?"
   confusion. */
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 100vh !important;
    height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
  }
}
`;

  // -------- HTML --------
  const icons = {
    logo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9L12 3z"/><path d="M12 8v8M8 10.5l4-2.5 4 2.5"/></svg>',
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    goals: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/></svg>',
    stack: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z"/><path d="M4 12l8 4.5 8-4.5"/><path d="M4 16.5l8 4.5 8-4.5"/></svg>',
    water: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/></svg>',
    gym: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/><path d="M9 9v6M15 9v6"/></svg>',
    finance: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v2"/><path d="M4 7.5v9A2.5 2.5 0 0 0 6.5 19H20V9H6.5A2.5 2.5 0 0 1 4 6.5"/><path d="M17 14h.01"/></svg>'
  };
  const html = `
<header class="topbar" id="topbar" role="navigation" aria-label="Primary navigation">
  <div class="topbar-logo" aria-hidden="true">${icons.logo}</div>
  <nav class="topbar-nav">
    <a href="index.html" class="topbar-item topbar-icon" id="topbarDashboard" data-page="dashboard" data-label="Dashboard" aria-label="Dashboard">${icons.dashboard}</a>
    <a href="index.html" class="topbar-item topbar-icon" id="topbarGoals" data-page="goals" data-label="Goals" aria-label="Goals">
      ${icons.goals}
      <span class="topbar-pill-count" id="topbarGoalsCount">—</span>
    </a>
    <a href="health.html" class="topbar-item topbar-icon" id="topbarStack" data-page="stack" data-label="Stack" aria-label="Stack">
      ${icons.stack}
      <span class="topbar-pill-count" id="topbarStackCount">—</span>
    </a>
    <div class="topbar-water-wrap">
      <a href="health.html#water" class="topbar-icon" id="topbarWater" data-page="water" data-label="Water" aria-label="Water">
        ${icons.water}
        <span class="topbar-pill-count" id="topbarWaterCount">—</span>
      </a>
      <button class="topbar-water-add" id="topbarWaterAdd" aria-label="Log one drink" type="button">+</button>
    </div>
    <a href="gym.html" class="topbar-item topbar-icon" id="topbarGym" data-page="gym" data-label="Gym" aria-label="Gym">${icons.gym}</a>
    <a href="finance.html" class="topbar-item topbar-icon" id="topbarFinance" data-page="finance" data-label="Finance" aria-label="Finance">${icons.finance}</a>
  </nav>
</header>
`;

  function setActiveNav() {
    const path = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const hash = window.location.hash;
    const activePage = path === 'finance.html' ? 'finance'
      : path === 'gym.html' ? 'gym'
      : path === 'health.html' && hash === '#water' ? 'water'
      : path === 'health.html' ? 'stack'
      : 'dashboard';
    document.querySelectorAll('.topbar-icon[data-page]').forEach(el => {
      el.classList.toggle('active', el.dataset.page === activePage);
    });
  }

  function injectStyleAndHTML() {
    if (document.getElementById('topbar')) return; // already injected
    const style = document.createElement('style');
    style.id = 'topbar-style';
    style.textContent = css;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    document.body.insertBefore(wrap.firstChild, document.body.firstChild);
  }

  // -------- Active-date helpers (match the goals page 6 AM rollover) --------
  function activeDateKey() {
    const now = new Date();
    const d = new Date(now);
    if (now.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function calendarDateKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // -------- Read progress from localStorage --------
  function getGoalsProgress() {
    const key = 'goals:' + activeDateKey();
    let goals = [];
    try { goals = JSON.parse(localStorage.getItem(key)) || []; } catch (e) {}
    const total = Array.isArray(goals) ? goals.length : 0;
    const done = total ? goals.filter(g => g && g.done).length : 0;
    return { done, total };
  }

  function getStackProgress() {
    let items = [];
    try { items = JSON.parse(localStorage.getItem('stack:items')) || []; } catch (e) {}
    let taken = {};
    try { taken = JSON.parse(localStorage.getItem('stack:taken:' + activeDateKey())) || {}; } catch (e) {}
    const total = Array.isArray(items) ? items.length : 0;
    const done = total ? items.filter(i => i && taken[i.id]).length : 0;
    return { done, total };
  }

  function getWaterProgress() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state) return { done: 0, total: 0 };
    const todayKey = calendarDateKey();
    const done = (state.logs || {})[todayKey] || 0;
    const p = state.profile || { weightKg: 75 };
    const wKg = state.weightUnit === 'lb' ? (p.weightKg || 0) / 2.20462 : (p.weightKg || 0);
    const base = wKg * 35;
    const exercise = (p.activityHrsPerWeek || 0) / 7 * 500;
    const caffeine = Math.max(0, (state.caffeineMgPerDay || 0) - 200) * 1.5;
    const subs = (state.substances || []).reduce((s, x) => {
      const dose = (x && x.dose != null ? x.dose : (x && x.defaultDose)) || 0;
      return s + Math.max(0, dose * ((x && x.mlPerUnit) || 0));
    }, 0);
    let adjust = 0;
    if (p.sex === 'm') adjust += 200;
    if ((p.age || 0) >= 50) adjust += 100;
    const totalMl = base + exercise + caffeine + subs + adjust;
    let unitVol;
    if (state.unit === 'glass') unitVol = state.glassMl || 250;
    else if (state.unit === 'oz') unitVol = 30;
    else if (state.unit === 'ml') unitVol = 1;
    else unitVol = state.bottleMl || 500;
    const total = Math.max(1, Math.ceil(totalMl / unitVol));
    return { done, total };
  }

  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    if (done >= total * 0.5) return 'warn';
    // Past 6pm and still under half → flag as missed
    const h = new Date().getHours();
    if (h >= 18 && done < total * 0.5) return 'miss';
    return 'warn';
  }

  function setPillStatus(pillEl, status) {
    pillEl.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') pillEl.classList.add(status);
  }

  function render() {
    const goalsEl = document.getElementById('topbarGoals');
    const stackEl = document.getElementById('topbarStack');
    const waterEl = document.getElementById('topbarWater');
    if (!goalsEl) return; // not injected yet

    const g = getGoalsProgress();
    const s = getStackProgress();
    const w = getWaterProgress();

    document.getElementById('topbarGoalsCount').textContent =
      g.total ? g.done + '/' + g.total : '0';
    document.getElementById('topbarStackCount').textContent =
      s.total ? s.done + '/' + s.total : '0';
    document.getElementById('topbarWaterCount').textContent =
      w.total ? w.done + '/' + w.total : '0';

    setPillStatus(goalsEl, classifyStatus(g.done, g.total));
    setPillStatus(stackEl, classifyStatus(s.done, s.total));
    setPillStatus(waterEl, classifyStatus(w.done, w.total));
  }

  // -------- Water +1 (works from any page) --------
  function defaultWaterState() {
    return {
      unit: 'bottle', bottleMl: 500, glassMl: 250, weightUnit: 'kg',
      profile: { weightKg: 75, age: 25, sex: 'm', activityHrsPerWeek: 5 },
      caffeineMgPerDay: 200, substances: [], logs: {}
    };
  }

  async function pushWaterMergedToSupabase(localWater) {
    // Only do this when we're NOT on the health page — health page
    // has its own sync that already detects the localStorage change.
    if (window.location.pathname.endsWith('/health.html') ||
        window.location.pathname.endsWith('health.html')) return;

    if (!window.supabase || !TOPBAR_SUPABASE_URL || !TOPBAR_SUPABASE_KEY) return;
    if (TOPBAR_SUPABASE_URL.indexOf('PASTE-') === 0) return;

    try {
      const supa = window.supabase.createClient(TOPBAR_SUPABASE_URL, TOPBAR_SUPABASE_KEY);
      const { data } = await supa
        .from('app_state').select('data').eq('key', 'health').maybeSingle();
      const current = (data && data.data) || {};
      const merged = Object.assign({}, current, { po_water_v1: localWater });
      await supa.from('app_state').upsert(
        { key: 'health', data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch (e) { /* offline — local change will sync next time user visits health */ }
  }

  function addWater() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state || typeof state !== 'object') state = defaultWaterState();
    state.logs = state.logs || {};
    const k = calendarDateKey();
    state.logs[k] = (state.logs[k] || 0) + 1;
    try { localStorage.setItem('po_water_v1', JSON.stringify(state)); } catch (e) {}
    render();

    const btn = document.getElementById('topbarWaterAdd');
    if (btn) {
      btn.classList.add('flash');
      setTimeout(() => btn.classList.remove('flash'), 220);
    }

    pushWaterMergedToSupabase(state);
  }

  // -------- Mobile lockdown helpers --------
  // Belt-and-suspenders zoom prevention — iOS Safari sometimes ignores
  // user-scalable=no, so we also kill the gesture events directly.
  function blockGesture(e) { e.preventDefault(); }
  function lockGestures() {
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    // Also kill the iOS double-tap-to-zoom on any tap.
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }

  // Watch every known modal-bg / overlay class — when any one of them
  // gets `.show` or `.is-open`, lock the body scroll. When the last
  // one closes, unlock.
  function startModalLock() {
    const MODAL_SELECTORS = [
      '.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam'
    ];
    function anyOpen() {
      for (const sel of MODAL_SELECTORS) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) {
            return true;
          }
        }
      }
      return false;
    }
    function sync() {
      document.body.classList.toggle('topbar-modal-open', anyOpen());
    }
    const observer = new MutationObserver(sync);
    // Observe class changes anywhere in body — modal toggles are rare so
    // a global subtree observer is cheap.
    observer.observe(document.body, {
      attributes: true, attributeFilter: ['class'], subtree: true
    });
    sync();
  }

  // -------- Boot --------
  function boot() {
    injectStyleAndHTML();
    setActiveNav();
    window.addEventListener('hashchange', setActiveNav);
    const btn = document.getElementById('topbarWaterAdd');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); addWater(); });
    render();
    lockGestures();
    startModalLock();

    // Re-render when localStorage changes from another tab/window OR when
    // the page becomes visible (sync may have pulled in the background).
    window.addEventListener('storage', render);
    window.addEventListener('focus', render);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

    // Periodic refresh so counts stay current after midnight rollover etc.
    setInterval(render, 30 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
