// Authored challenge extension for the released companion UI. This narrow,
// checked build transform preserves the current artwork and other minigames
// when the newer companion checkout lives on a different development machine.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export function attachSkillKitchen(html){
 const hook=/\.controller=([\w$]+)\(([\w$]+)\("\.arcade-cooking"\),\{sprite:/g;
 if(!html.includes('/* skill-kitchen-hook:v1 */')){
  const matches=[...html.matchAll(hook)];if(matches.length!==1)throw Error('Expected exactly one cooking mount. Recheck the companion UI hook.');
  html=html.replace(hook,(_,mount,query)=>'.controller=(/* skill-kitchen-hook:v1 */(h,c)=>globalThis.starKitchenChallenge.mount(h,c,'+mount+'))('+query+'(".arcade-cooking"),{sprite:');
 }
 html=html.replace(/\(h,c\)=>globalThis\.starKitchenChallenge\.mount\(h,c,([\w$]+)\)/g,(_,legacy)=>'(h,c)=>globalThis.starKitchenChallenge?.mount?globalThis.starKitchenChallenge.mount(h,c,'+legacy+'):'+legacy+'(h,c)');
 if(!html.includes('data-kitchen-version="1"'))html=html.replace('<div id="little-star-demo"','<div id="little-star-demo" data-kitchen-version="1"');
 if(!html.includes('href="little-star-kitchen.css"'))html=html.replace('</head>','<link rel="stylesheet" href="little-star-kitchen.css"></head>');
 return html;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const path=new URL('../little-star.html',import.meta.url),before=readFileSync(path,'utf8'),after=attachSkillKitchen(before);
 if(after!==before)writeFileSync(path,after);console.log('Generated skill kitchen hook; existing release art and UI preserved.');
}
