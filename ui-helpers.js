export function applyViewerTheme(viewer){
  document.body.classList.add(viewer==='him'?'him-theme':'her-theme');
  const theme=document.querySelector('meta[name="theme-color"]')||document.head.appendChild(Object.assign(document.createElement('meta'),{name:'theme-color'}));
  theme.content=viewer==='him'?'#0d1730':'#f4c95d';
}

export function setupAuthUI(data,user){
  const root=document.getElementById('auth-root');if(!root||data?.mode==='local'||user){if(root)root.innerHTML='';return;}
  root.innerHTML=`<section class="auth-gate"><div class="auth-card"><span class="auth-icon">☀︎☾</span><p class="tiny-kicker">just for us</p><h2>sign in</h2><form id="shared-auth-form"><label><span>Email</span><input id="shared-auth-email" type="email" autocomplete="username" required placeholder="your email"></label><label><span>Password</span><input id="shared-auth-password" type="password" autocomplete="current-password" minlength="6" required placeholder="your password"></label><p class="auth-error" id="shared-auth-error" role="alert"></p><button class="primary-action" type="submit">sign in</button></form></div></section>`;
  const form=document.getElementById('shared-auth-form');const email=document.getElementById('shared-auth-email');const password=document.getElementById('shared-auth-password');const error=document.getElementById('shared-auth-error');
  form.addEventListener('submit',async event=>{event.preventDefault();error.textContent='';const button=form.querySelector('[type="submit"]');setButtonBusy(button,true,'signing in…');try{await data.signIn(email.value,password.value);}catch(problem){error.textContent=`${data.friendlyError(problem)} Try checking the spelling and internet.`;}finally{setButtonBusy(button,false);}});
}

export function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
export function toast(message){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.textContent=message;document.body.append(el);window.littleHaptic?.('tap');setTimeout(()=>el.remove(),2400);}
export function dateKey(value){return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;}
export function setButtonBusy(button,busy,label='thinking…'){
  if(!button)return;
  if(busy){button.dataset.normalText=button.textContent;button.textContent=label;button.disabled=true;button.classList.add('is-busy');button.setAttribute('aria-busy','true');}
  else{button.textContent=button.dataset.normalText||button.textContent;button.disabled=false;button.classList.remove('is-busy');button.removeAttribute('aria-busy');delete button.dataset.normalText;}
}
export function showFailure(message,solution){window.showLittleFailure?.(message,solution);}


// Lists re-render from their live listener on every change either phone
// makes. An inline edit form rebuilt that way lost whatever was half-typed
// (and the cursor) the moment the other phone added a task or read a note.
// Paint through this and open edit forms keep their text, focus and caret.
export function keepInlineEdits(container, paint) {
  if (!container) { paint(); return; }
  const key = form => Object.entries(form.dataset).map(([name, value]) => `${name}=${value}`).join('&');
  const fields = form => [...form.elements].filter(el => /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  const saved = [...container.querySelectorAll('form.inline-edit')].map(form => ({
    key: key(form),
    values: fields(form).map(el => (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value)
  }));
  const active = document.activeElement;
  const activeForm = container.contains(active) ? active.closest('form.inline-edit') : null;
  const activeKey = activeForm ? key(activeForm) : '';
  const activeIndex = activeForm ? fields(activeForm).indexOf(active) : -1;
  let caret = null;
  try { if (activeForm) caret = [active.selectionStart, active.selectionEnd]; } catch (_) { caret = null; }
  paint();
  if (!saved.length) return;
  const forms = [...container.querySelectorAll('form.inline-edit')];
  for (const entry of saved) {
    const form = forms.find(candidate => key(candidate) === entry.key);
    if (!form) continue;
    fields(form).forEach((el, index) => {
      if (!(index in entry.values)) return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = entry.values[index]; else el.value = entry.values[index];
    });
    if (entry.key === activeKey && activeIndex >= 0) {
      const target = fields(form)[activeIndex];
      target?.focus({ preventScroll: true });
      try { if (caret && caret[0] != null) target.setSelectionRange(caret[0], caret[1]); } catch (_) { /* not a text field */ }
    }
  }
}
