export type Box={x:number;y:number;w:number;h:number};
export const resizeDirections=['nw','n','ne','e','se','s','sw','w'] as const;
export type DragDirection=typeof resizeDirections[number]|'move';
const limit=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export function dragGeometry(start:Box,direction:DragDirection,dx:number,dy:number,canvas={w:13.333333,h:7.5}):Box{
 const min=.12;
 if(direction==='move')return {...start,x:limit(start.x+dx,0,canvas.w-start.w),y:limit(start.y+dy,0,canvas.h-start.h)};
 let left=start.x,top=start.y,right=start.x+start.w,bottom=start.y+start.h;
 if(direction.includes('w'))left=limit(start.x+dx,0,right-min);
 if(direction.includes('e'))right=limit(right+dx,left+min,canvas.w);
 if(direction.includes('n'))top=limit(start.y+dy,0,bottom-min);
 if(direction.includes('s'))bottom=limit(bottom+dy,top+min,canvas.h);
 return {x:left,y:top,w:right-left,h:bottom-top};
}
