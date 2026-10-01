import { bootPage } from './page-boot.js';

await bootPage();

const tabs = [...document.querySelectorAll('[data-guide-tab]')];
const panels = {
  tutorial: document.getElementById('guide-tutorial'),
  changes: document.getElementById('guide-changes')
};

function showTab() {
  const name = location.hash === '#changes' ? 'changes' : 'tutorial';
  for (const tab of tabs) {
    const active = tab.dataset.guideTab === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  for (const [key, panel] of Object.entries(panels)) panel.hidden = key !== name;
}

for (const tab of tabs) {
  tab.addEventListener('click', () => { location.hash = tab.dataset.guideTab; showTab(); });
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[(tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    next.focus();
    next.click();
  });
}
window.addEventListener('hashchange', showTab);
showTab();
