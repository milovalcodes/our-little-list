// Presentation only: account membership is still resolved by viewer.js.
// Run synchronously in the head, before Firebase/module imports can delay paint.
(function () {
  const root = document.documentElement;
  const read = (store, key) => { try { return window[store].getItem(key); } catch (_) { return null; } };
  const valid = side => side === 'her' || side === 'him';
  const cachedSide = read('localStorage', 'our-little-list-side');
  const params = new URLSearchParams(location.search);
  const hint = params.get('as') || params.get('from') || read('sessionStorage', 'little-preview-side');
  const pathSide = location.pathname.match(/\/(her|him)\.html$/)?.[1];
  let side = valid(cachedSide) ? cachedSide : valid(hint) ? hint : pathSide;
  let profile = {};
  try { profile = JSON.parse(read('localStorage', 'our-little-list-couple-profile-v1')) || {}; } catch (_) {}
  function setSide(value) {
    if (!valid(value)) return;
    side = value;
    root.style.backgroundColor = value === 'him' ? '#0d1730' : '#fffaf5';
    if (document.body) {
      document.body.classList.remove('him-theme', 'her-theme');
      document.body.classList.add(value + '-theme');
    }
  }
  window.LittleAppearance = { setSide };
  setSide(side);
  function paint() {
    setSide(side);
    for (const element of document.querySelectorAll('[data-person-name]')) {
      const raw = profile[element.dataset.personName === 'sun' ? 'sunName' : 'moonName'];
      const name = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 24);
      const value = name || element.dataset.personFallback;
      if (!value) continue;
      const text = (element.dataset.personFormat || '{name}').replace('{name}', value);
      if (element.textContent !== text) element.textContent = text;
    }
  }
  // Parser mutations are delivered before rendering, including the new body
  // and greeting. Stop at DOMContentLoaded so live profile/auth updates own UI.
  const observer = new MutationObserver(paint);
  observer.observe(root, { childList:true, subtree:true });
  document.addEventListener('DOMContentLoaded', () => { paint(); observer.disconnect(); }, { once:true });
})();
