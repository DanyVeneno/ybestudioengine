export function normalizeAssessment(raw){
  if(Array.isArray(raw)) return raw;
  const levels=(raw.levels||[]).map(l=>({label:l.label,score:Number(l.score??l.value),description:l.description}));
  return (raw.dimensions||[]).flatMap(dim=>(dim.questions||[]).map((text,index)=>({
    id:`${dim.id}-${index+1}`,
    dimension:dim.id,
    dimensionLabel:dim.name,
    text,
    levels
  })));
}
