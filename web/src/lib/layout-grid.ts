/** Equal tracks fill the supplied extent exactly, including the final edge. */
export function equalTracks(start:number,extent:number,count:number,gap:number){
  const size=(extent-gap*(count-1))/count;
  return Array.from({length:count},(_,i)=>({start:start+i*(size+gap),size}));
}
export function sectionTabs(sections:string[],active:string){
  const all=[...new Set(sections.map(s=>s.trim()).filter(s=>s&&!['표지','목차'].includes(s)))];
  if(active&&!all.includes(active))all.push(active);
  const current=Math.max(0,all.indexOf(active));
  const stable=all.length<=8;
  const start=stable?0:Math.max(0,Math.min(current-2,all.length-6));
  const count=stable?all.length:6,width=Math.min(9.29,count*1.5);
  return all.slice(start,start+count).map((label,i)=>({label,active:label===active,...equalTracks(12.91-width,width,count,0)[i]}));
}
