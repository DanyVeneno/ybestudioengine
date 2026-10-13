export const QUESTIONNAIRE_VERSION='YBE-40Q-2';
export const METHODOLOGY_VERSION='YBE-M2';
export const DIMENSIONS=['strategy','customer','ux','processes','technology','data','automation','ai'];
export function normalizeAssessment(raw) {
  if(raw.questionnaireVersion!==QUESTIONNAIRE_VERSION || raw.methodologyVersion!==METHODOLOGY_VERSION) throw new Error('Versión de cuestionario incompatible.');
  if(!Array.isArray(raw.dimensions)||raw.dimensions.length!==8) throw new Error('Se requieren ocho dimensiones.');
  const questions=raw.dimensions.flatMap((dim,i)=>{
    if(dim.id!==DIMENSIONS[i] || dim.questions.length!==5) throw new Error('Estructura de dimensiones inválida.');
    return dim.questions.map((q,j)=>({...q,dimension:dim.id,dimensionLabel:dim.name,introduction:dim.introduction,
      id:q.id===dim.id+'-'+(j+1)?q.id:(()=>{throw new Error('ID inestable.')})()}));
  });
  if(new Set(questions.map(q=>q.id)).size!==40) throw new Error('IDs duplicados.');
  questions.forEach(q=>{
    if(!['text','explanation','example'].every(k=>typeof q[k]==='string'&&q[k].trim()) || !Array.isArray(q.levels) || q.levels.length!==4 ||
      !q.levels.every((l,i)=>l.score===[25,50,75,100][i]&&typeof l.description==='string'&&l.description.trim()))
      throw new Error('Pregunta o escala inválida: '+q.id);
  });
  return questions;
}
