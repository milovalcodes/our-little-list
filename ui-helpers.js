export function applyViewerTheme(viewer){
  document.body.classList.add(viewer==='him'?'him-theme':'her-theme');
  const theme=document.querySelector('meta[name="theme-color"]')||document.head.appendChild(Object.assign(document.createElement('meta'),{name:'theme-color'}));
  theme.content=viewer==='him'?'#152d46':'#f9bfd1';
}

export function setupAuthUI(data,user){
  const root=document.getElementById('auth-root');if(!root||data?.mode==='local'||user){if(root)root.innerHTML='';return;}
  root.innerHTML=`<section class="auth-gate"><div class="auth-card"><span class="auth-icon">💌</span><p class="tiny-kicker">private little corner</p><h2>Come into our space</h2><p>Use the same shared login on both phones so everything stays together.</p><form id="shared-auth-form"><label><span>Email</span><input id="shared-auth-email" type="email" autocomplete="username" required placeholder="our@email.com"></label><label><span>Password</span><input id="shared-auth-password" type="password" autocomplete="current-password" minlength="6" required placeholder="at least 6 characters"></label><p class="auth-error" id="shared-auth-error" role="alert"></p><button class="primary-action" type="submit">Sign in to our space</button><button class="create-space" id="shared-create-space" type="button">Create our shared space</button></form><p class="auth-fine">Create it once, then use the same login on the other phone.</p></div></section>`;
  const form=document.getElementById('shared-auth-form');const email=document.getElementById('shared-auth-email');const password=document.getElementById('shared-auth-password');const error=document.getElementById('shared-auth-error');
  form.addEventListener('submit',async event=>{event.preventDefault();error.textContent='';try{await data.signIn(email.value,password.value);}catch(problem){error.textContent=data.friendlyError(problem);}});
  document.getElementById('shared-create-space').addEventListener('click',async()=>{if(!form.reportValidity())return;error.textContent='';try{await data.createAccount(email.value,password.value);}catch(problem){error.textContent=data.friendlyError(problem);}});
}

export function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
export function toast(message){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),2400);}
export function dateKey(value){return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;}
