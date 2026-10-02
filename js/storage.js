const KEY='ybe-v5-state';
const initial=()=>({answers:{},index:0,intent:null,result:null});
export const load=()=>{try{const data=JSON.parse(localStorage.getItem(KEY));return data&&typeof data==='object'?{...initial(),...data,answers:data.answers||{}}:initial()}catch{return initial()}};
export const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
export const clear=()=>localStorage.removeItem(KEY);
