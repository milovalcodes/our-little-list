// Send a spoiler-free result: the phone's share sheet where there is one,
// otherwise the clipboard. Returns a short note for the panel.
export async function shareResult(text){
 if(navigator.share){
  try{await navigator.share({text});return 'shared ♡';}
  catch(error){if(error?.name==='AbortError')return '';}
 }
 try{await navigator.clipboard.writeText(text);return 'copied · paste it anywhere';}
 catch(_){return 'couldn’t copy on this device';}
}
