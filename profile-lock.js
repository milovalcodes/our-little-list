(() => {
  const params = new URLSearchParams(window.location.search);
  const explicitViewer = document.body.dataset.viewer || params.get('as') || params.get('from');
  if (!explicitViewer && !document.body.dataset.app) return;

  const viewer = explicitViewer === 'him' ? 'him' : 'her';
  const sideName = viewer === 'her' ? 'sun side' : 'moon side';
  const portrait = viewer === 'her' ? 'sun-profile.png' : 'moon-profile.png';
  const pinKey = `our-little-list-pin-${viewer}-v1`;
  const unlockKey = `our-little-list-unlocked-${viewer}-v1`;

  if (sessionStorage.getItem(unlockKey) === 'yes') {
    addLockButton();
    return;
  }

  const saved = readSavedPin();
  const isSetup = !saved;
  const gate = document.createElement('aside');
  gate.className = `profile-lock-gate ${viewer}-lock`;
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-labelledby', 'profile-lock-title');
  gate.innerHTML = `
    <div class="profile-lock-card">
      <img class="profile-lock-face" src="${portrait}" alt="">
      <p class="tiny-kicker">${sideName}</p>
      <h2 id="profile-lock-title">${isSetup ? 'make your code' : 'your code'}</h2>
      <p class="profile-lock-copy">${isSetup ? 'choose 4–6 numbers for this side on this phone. the shared login stays the same.' : 'just keeping the two sides separate.'}</p>
      <form class="profile-lock-form">
        <label><span>${isSetup ? 'New code' : 'Code'}</span><input id="profile-pin" type="password" inputmode="numeric" autocomplete="off" minlength="4" maxlength="6" pattern="[0-9]{4,6}" required aria-describedby="profile-lock-error"></label>
        ${isSetup ? '<label><span>Again</span><input id="profile-pin-again" type="password" inputmode="numeric" autocomplete="off" minlength="4" maxlength="6" pattern="[0-9]{4,6}" required></label>' : ''}
        <p class="profile-lock-error" id="profile-lock-error" role="alert"></p>
        <button class="primary-action profile-lock-submit" type="submit">${isSetup ? 'save my code' : 'open my side'}</button>
      </form>
      <a class="profile-lock-back" href="index.html">← pick the other side</a>
    </div>`;
  document.body.append(gate);
  document.body.classList.add('profile-locked');

  const form = gate.querySelector('form');
  const pin = gate.querySelector('#profile-pin');
  const again = gate.querySelector('#profile-pin-again');
  const error = gate.querySelector('#profile-lock-error');
  const submit = gate.querySelector('.profile-lock-submit');
  [pin, again].filter(Boolean).forEach(input => input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
    error.textContent = '';
  }));

  window.setTimeout(() => pin.focus(), 120);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    if (!/^\d{4,6}$/.test(pin.value)) {
      error.textContent = 'use 4–6 numbers.';
      return;
    }
    if (isSetup && pin.value !== again.value) {
      error.textContent = 'those do not match yet.';
      again.focus();
      return;
    }

    setBusy(true);
    try {
      if (isSetup) {
        const salt = makeSalt();
        const hash = await hashPin(pin.value, salt);
        localStorage.setItem(pinKey, JSON.stringify({ salt, hash }));
      } else {
        const hash = await hashPin(pin.value, saved.salt);
        if (hash !== saved.hash) {
          error.textContent = 'not quite. try again.';
          pin.value = '';
          pin.focus();
          return;
        }
      }
      sessionStorage.setItem(unlockKey, 'yes');
      gate.classList.add('is-opening');
      document.body.classList.remove('profile-locked');
      window.setTimeout(() => gate.remove(), 280);
      addLockButton();
    } catch (_) {
      error.textContent = 'this phone could not save the code. try again.';
    } finally {
      setBusy(false);
    }
  });

  function setBusy(busy) {
    submit.disabled = busy;
    submit.classList.toggle('is-busy', busy);
    submit.textContent = busy ? (isSetup ? 'saving…' : 'checking…') : (isSetup ? 'save my code' : 'open my side');
  }

  function readSavedPin() {
    try {
      const record = JSON.parse(localStorage.getItem(pinKey));
      return record?.salt && record?.hash ? record : null;
    } catch (_) {
      return null;
    }
  }

  function makeSalt() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function hashPin(value, salt) {
    const bytes = new TextEncoder().encode(`${salt}:${value}`);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function addLockButton() {
    if (document.querySelector('.side-lock-button')) return;
    const button = document.createElement('button');
    button.className = 'side-lock-button';
    button.type = 'button';
    button.textContent = 'lock side';
    button.setAttribute('aria-label', `Lock the ${sideName}`);
    button.addEventListener('click', () => {
      sessionStorage.removeItem(unlockKey);
      window.location.reload();
    });
    document.body.append(button);
  }
})();
