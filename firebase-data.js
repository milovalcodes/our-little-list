import { firebaseConfig } from './firebase-config.js';

const configured = firebaseConfig?.apiKey && !firebaseConfig.apiKey.startsWith('REPLACE_');

export async function createDataLayer({ onItems, onAuth, collectionName = 'items' }) {
  if (!configured) return createLocalLayer(onItems,onAuth,collectionName);

  const [{initializeApp,getApps,getApp},{getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut},{getFirestore,collection,onSnapshot,addDoc,setDoc,updateDoc,deleteDoc,doc}] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
  ]);
  const app=getApps().length?getApp():initializeApp(firebaseConfig); const auth=getAuth(app); const db=getFirestore(app); let unsubscribe=null;

  const itemsCollection=()=>collection(db,'households',auth.currentUser.uid,collectionName);
  const layer={
    mode:'firebase',
    add:item=>addDoc(itemsCollection(),item),
    set:(id,item)=>setDoc(doc(itemsCollection(),id),item,{merge:true}),
    update:(id,changes)=>updateDoc(doc(itemsCollection(),id),changes),
    remove:id=>deleteDoc(doc(itemsCollection(),id)),
    signIn:(email,password)=>signInWithEmailAndPassword(auth,email,password),
    createAccount:(email,password)=>createUserWithEmailAndPassword(auth,email,password),
    signOut:()=>signOut(auth),
    friendlyError(error){
      const code=error?.code||'';
      if(code.includes('invalid-credential'))return 'That email or password does not match.';
      if(code.includes('email-already-in-use'))return 'That shared space already exists—tap Sign in instead.';
      if(code.includes('weak-password'))return 'Choose a password with at least 6 characters.';
      return 'Something went sideways. Please try again.';
    }
  };

  onAuthStateChanged(auth,user=>{
    unsubscribe?.(); unsubscribe=null; onAuth(user);
    if(!user){onItems([]);return;}
    unsubscribe=onSnapshot(itemsCollection(),snapshot=>onItems(snapshot.docs.map(entry=>({id:entry.id,...entry.data()}))));
  });
  return layer;
}

function createLocalLayer(onItems,onAuth,collectionName){
  const key=`our-little-list-${collectionName}-v1`; let items=[];
  try{items=JSON.parse(localStorage.getItem(key))?.items||[];}catch(_){items=[];}
  const publish=()=>{localStorage.setItem(key,JSON.stringify({items}));onItems([...items]);};
  queueMicrotask(()=>{onAuth(null);onItems([...items]);});
  return {
    mode:'local',
    async add(item){items.push({id:crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`,...item});publish();},
    async set(id,item){const current=items.find(entry=>entry.id===id);if(current)Object.assign(current,item);else items.push({id,...item});publish();},
    async update(id,changes){const item=items.find(entry=>entry.id===id);if(item)Object.assign(item,changes);publish();},
    async remove(id){items=items.filter(entry=>entry.id!==id);publish();},
    async signIn(){},async createAccount(){},async signOut(){},friendlyError(){return 'Firebase is not connected yet.';}
  };
}
