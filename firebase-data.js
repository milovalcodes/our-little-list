import { firebaseConfig } from './firebase-config.js';

const configured = firebaseConfig?.apiKey && !firebaseConfig.apiKey.startsWith('REPLACE_');

export async function createDataLayer({ onItems, onAuth, collectionName = 'items' }) {
  if (!configured) return createLocalLayer(onItems,onAuth,collectionName);

  let modules;
  try{
    modules=await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
    ]);
  }catch(problem){announceError(problem,'start');throw problem;}
  const [{initializeApp,getApps,getApp},{getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut},{getFirestore,collection,onSnapshot,addDoc,setDoc,updateDoc,deleteDoc,doc,getDoc}]=modules;
  const app=getApps().length?getApp():initializeApp(firebaseConfig); const auth=getAuth(app); const db=getFirestore(app); let unsubscribe=null;

  const namedCollection=name=>collection(db,'households',auth.currentUser.uid,name);
  const itemsCollection=()=>namedCollection(collectionName);
  const layer={
    mode:'firebase',
    add:item=>addDoc(itemsCollection(),item),
    set:(id,item)=>setDoc(doc(itemsCollection(),id),item,{merge:true}),
    update:(id,changes)=>updateDoc(doc(itemsCollection(),id),changes),
    remove:id=>deleteDoc(doc(itemsCollection(),id)),
    listenTo:(name,callback)=>onSnapshot(namedCollection(name),snapshot=>callback(snapshot.docs.map(entry=>({id:entry.id,...entry.data()}))),problem=>announceError(problem,'listen')),
    addTo:(name,item)=>addDoc(namedCollection(name),item),
    setTo:(name,id,item)=>setDoc(doc(namedCollection(name),id),item,{merge:true}),
    updateIn:(name,id,changes)=>updateDoc(doc(namedCollection(name),id),changes),
    removeFrom:(name,id)=>deleteDoc(doc(namedCollection(name),id)),
    async push(person,message){
      const device=await getDoc(doc(db,'households',auth.currentUser.uid,'devices',person));
      const token=device.data()?.expoPushToken;
      if(typeof token!=='string'||!/^(ExponentPushToken|ExpoPushToken)\[/.test(token))return {sent:false,reason:'not-registered'};
      await fetch('https://exp.host/--/api/v2/push/send',{
        method:'POST',
        mode:'no-cors',
        headers:{'Content-Type':'text/plain'},
        body:JSON.stringify({to:token,...message})
      });
      return {sent:true};
    },
    signIn:(email,password)=>signInWithEmailAndPassword(auth,email,password),
    createAccount:(email,password)=>createUserWithEmailAndPassword(auth,email,password),
    signOut:()=>signOut(auth),
    friendlyError(error){
      const code=error?.code||'';
      if(code.includes('invalid-credential'))return 'That email or password does not match.';
      if(code.includes('email-already-in-use'))return 'Account already exists. Sign in instead.';
      if(code.includes('weak-password'))return 'Password needs 6 characters.';
      if(code.includes('network'))return 'This phone cannot connect right now.';
      if(code.includes('too-many-requests'))return 'Too many tries. Wait a minute and try again.';
      return 'That did not work. Try again.';
    }
  };

  onAuthStateChanged(auth,user=>{
    unsubscribe?.(); unsubscribe=null; announceReady();onAuth(user);
    if(!user){onItems([]);return;}
    unsubscribe=onSnapshot(itemsCollection(),snapshot=>onItems(snapshot.docs.map(entry=>({id:entry.id,...entry.data()}))),problem=>announceError(problem,'listen'));
  },problem=>{announceError(problem,'auth');onAuth(null);onItems([]);});
  return layer;
}

function createLocalLayer(onItems,onAuth,collectionName){
  const key=`our-little-list-${collectionName}-v1`; let items=[];
  try{items=JSON.parse(localStorage.getItem(key))?.items||[];}catch(_){items=[];}
  const publish=()=>{localStorage.setItem(key,JSON.stringify({items}));onItems([...items]);};
  queueMicrotask(()=>{announceReady();onAuth(null);onItems([...items]);});
  return {
    mode:'local',
    async add(item){const id=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`;items.push({id,...item});publish();return{id};},
    async set(id,item){const current=items.find(entry=>entry.id===id);if(current)Object.assign(current,item);else items.push({id,...item});publish();},
    async update(id,changes){const item=items.find(entry=>entry.id===id);if(item)Object.assign(item,changes);publish();},
    async remove(id){items=items.filter(entry=>entry.id!==id);publish();},
    listenTo(name,callback){
      const storageKey=`our-little-list-${name}-v1`;
      const read=()=>{try{return JSON.parse(localStorage.getItem(storageKey))?.items||[];}catch(_){return[];}};
      queueMicrotask(()=>callback(read()));
      const handler=event=>{if(event.key===storageKey)callback(read());};
      window.addEventListener('storage',handler);
      return()=>window.removeEventListener('storage',handler);
    },
    async addTo(name,item){
      const storageKey=`our-little-list-${name}-v1`;let named=[];
      try{named=JSON.parse(localStorage.getItem(storageKey))?.items||[];}catch(_){named=[];}
      const id=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`;
      named.push({id,...item});localStorage.setItem(storageKey,JSON.stringify({items:named}));return{id};
    },
    async setTo(name,id,item){
      const storageKey=`our-little-list-${name}-v1`;let named=[];
      try{named=JSON.parse(localStorage.getItem(storageKey))?.items||[];}catch(_){named=[];}
      const current=named.find(entry=>entry.id===id);if(current)Object.assign(current,item);else named.push({id,...item});
      localStorage.setItem(storageKey,JSON.stringify({items:named}));
    },
    async updateIn(name,id,changes){return this.setTo(name,id,changes);},
    async removeFrom(name,id){
      const storageKey=`our-little-list-${name}-v1`;let named=[];
      try{named=JSON.parse(localStorage.getItem(storageKey))?.items||[];}catch(_){named=[];}
      named=named.filter(item=>item.id!==id);localStorage.setItem(storageKey,JSON.stringify({items:named}));
    },
    async push(){return{sent:false,reason:'not-registered'};},
    async signIn(){},async createAccount(){},async signOut(){},friendlyError(){return 'sync is offline.';}
  };
}

function announceReady(){document.dispatchEvent(new CustomEvent('littlelist:dataready'));}
function announceError(problem,stage){
  const code=String(problem?.code||'');let message='we could not load the shared stuff.';let solution='check the internet, then try again.';
  if(code.includes('permission-denied')){message='the shared stuff is locked right now.';solution='sign out and back in. If it keeps happening, the database rules need attention.';}
  else if(code.includes('unauthenticated')){message='the login expired.';solution='reload and sign in again.';}
  else if(code.includes('unavailable')||code.includes('network')||stage==='start'){message='we cannot reach the shared space.';solution='turn on Wi-Fi or mobile data, then try again.';}
  document.dispatchEvent(new CustomEvent('littlelist:dataerror',{detail:{message,solution,code}}));
}
