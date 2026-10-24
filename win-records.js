// Older or partial records must not crash the whole Activities page.
export function normalizeWeekRecord(record,fallback={}){
  const max=record?.format==='trio'&&Number.isInteger(record.round)&&record.round>=0&&record.round<=1000000?1600+400*record.round:800;
  const scale=record?.scoreVersion===2?1:10;
  const points=p=>Number.isInteger(record?.scores?.[p])&&record.scores[p]>=0&&record.scores[p]*scale<=max?record.scores[p]*scale:(fallback.scores?.[p]||0);
  return {...fallback,...record,scoreVersion:2,scores:{her:points('her'),him:points('him')},winners:Array.isArray(record?.winners)?[...new Set(record.winners.filter(p=>p==='her'||p==='him'))]:[]};
}
