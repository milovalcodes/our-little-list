// Compare-and-delete fencing matters when immediate requests race the cron,
// including when both see an abandoned lease. Neither can delete a newer lock.
export async function acquireDeliveryLock(db,path,now,staleMs=120000){
  const owner=crypto.randomUUID(),fields={acquiredAt:now,owner};
  if(await db.create(path,fields))return {owner,expiresAt:now+staleMs};
  const current=await db.getVersioned(path);
  if(!current||now-Number(current.record.acquiredAt||0)<staleMs)return null;
  if(!await db.removeIfUnchanged(path,current.updateTime))return null;
  return await db.create(path,fields)?{owner,expiresAt:now+staleMs}:null;
}

export async function releaseDeliveryLock(db,path,lease){
  const current=await db.getVersioned(path);
  if(current?.record.owner!==lease.owner)return false;
  return db.removeIfUnchanged(path,current.updateTime);
}
