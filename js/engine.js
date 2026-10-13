import {DIMENSIONS} from './data.js';
export const RULES=Object.freeze({minimumCoverage:3,weakDependency:65,redBelow:40,greenFrom:80});
export const dimNames={strategy:'Estrategia',customer:'Cliente',ux:'UX / CX',processes:'Procesos',technology:'Tecnología',data:'Datos',automation:'Automatización',ai:'Inteligencia Artificial'};
export const signal=score=>score==null?'unavailable':score<RULES.redBelow?'red':score<RULES.greenFrom?'amber':'green';
export const signalLabel=score=>({unavailable:'Sin cobertura suficiente',red:'Rojo',amber:'Amarillo',green:'Verde'})[signal(score)];
export const scoreText=score=>score==null?'Sin puntuación':Number(score.toFixed(2))+'/100';
export const registered=a=>!!a&&(a.status==='unknown'||(a.status==='scored'&&[25,50,75,100].includes(a.value)));
export const scored=a=>registered(a)&&a.status==='scored';
export function progress(questions,answers) {
  const responded=questions.filter(q=>registered(answers[q.id])).length;
  return {responded,total:questions.length,percent:questions.length?responded/questions.length*100:0,
    scored:questions.filter(q=>scored(answers[q.id])).length,unknown:questions.filter(q=>answers[q.id]?.status==='unknown').map(q=>q.id),
    pending:questions.filter(q=>!registered(answers[q.id])).map(q=>q.id),notes:questions.filter(q=>answers[q.id]?.note?.trim()).length};
}
export function calculate(questions,answers,maturity=[]) {
  const coverage={},dimensions={},p=progress(questions,answers);
  for(const d of DIMENSIONS){
    const qs=questions.filter(q=>q.dimension===d),values=qs.filter(q=>scored(answers[q.id])).map(q=>answers[q.id].value);
    coverage[d]={scored:values.length,total:qs.length,responded:qs.filter(q=>registered(answers[q.id])).length};
    dimensions[d]=values.length>=RULES.minimumCoverage?values.reduce((a,b)=>a+b,0)/values.length:null;
  }
  const available=Object.entries(dimensions).filter(([,s])=>s!=null);
  const overall=available.length===8?available.reduce((sum,[,s])=>sum+s,0)/8:null;
  const level=overall==null?{label:'Resultado parcial',description:'Aclara respuestas hasta lograr al menos 3/5 puntuables en cada dimensión.'}:
    maturity.find(x=>overall<=x.max)||{label:overall<40?'Fundamentos por construir':overall<60?'En integración':overall<80?'En evolución':'Ecosistema avanzado',description:'Madurez declarada, pendiente de contrastar.'};
  const sorted=[...available].sort((a,b)=>a[1]-b[1]);
  const strengths=[...available].filter(([d,s])=>signal(s)==='green'&&coverage[d].scored===5).sort((a,b)=>b[1]-a[1]);
  return {overall,dimensions,coverage,progress:p,level,gaps:sorted.slice(0,3),priorities:sorted.slice(0,4),strengths,
    relativeBest:[...available].sort((a,b)=>b[1]-a[1]).slice(0,3)};
}
// Postorder DFS: prerequisites before targets; separate active and visited sets detect cycles.
export function resolveDependencies(targets,result,deps) {
  const visited=new Set(),active=new Set(),route=[],cycles=[];
  function visit(d){
    if(active.has(d)){cycles.push(d);return;}
    if(visited.has(d)||!DIMENSIONS.includes(d))return;
    active.add(d);
    for(const pre of deps[d]||[]){
      if(active.has(pre)){cycles.push(pre);continue;}
      if(result.dimensions[pre]==null||result.dimensions[pre]<RULES.weakDependency)visit(pre);
    }
    active.delete(d);visited.add(d);route.push(d);
  }
  targets.forEach(visit);
  return {route,cycles:[...new Set(cycles)]};
}
export function dependencyRoute(result,deps){return resolveDependencies(result.gaps.length?[result.gaps[0][0]]:[],result,deps).route;}
export function recommendations(questions,answers,result,deps,knowledge,intention) {
  const focus=intention?.focus||[];
  const targets=DIMENSIONS.filter(d=>result.dimensions[d]==null||result.dimensions[d]<80)
    .sort((a,b)=>Number(focus.includes(b))-Number(focus.includes(a))||(result.dimensions[a]??-1)-(result.dimensions[b]??-1));
  const {route,cycles}=resolveDependencies(targets,result,deps);
  return route.map(d=>{
    const score=result.dimensions[d],qs=questions.filter(q=>q.dimension===d);
    const clarify=score==null;
    const source=qs.filter(q=>clarify?!scored(answers[q.id]):scored(answers[q.id])&&answers[q.id].value<80)
      .map(q=>({id:q.id,text:q.text,status:answers[q.id]?.status||'pending',value:answers[q.id]?.value??null}));
    const dependencies=resolveDependencies([d],result,deps).route.filter(x=>x!==d);
    return {id:d,score,coverage:result.coverage[d],kind:clarify?'clarify':'strengthen',source,dependencies,cycles,
      rule:clarify?'Menos de 3/5 puntuables: recopilar o aclarar información, sin inferir baja madurez.':'Puntuación disponible menor de 80: fortalecer capacidad; dependencias débiles menores de 65 (regla provisional).',
      capacity:clarify?'Aclarar información de '+dimNames[d]:knowledge[d]?.interpretation||'Fortalecer '+dimNames[d],
      goal:intention?'Objetivo: '+intention.title+'. '+(focus.includes(d)?'Esta capacidad está directamente relacionada con el objetivo.':'Esta capacidad habilita la ruta y la continuidad del negocio.'):'Objetivo sin definir: revisar prioridades con el contexto del negocio.',
      action:clarify?'Recopilar información para '+dimNames[d]:(knowledge[d]?.actions?.[0]||'Fortalecer '+dimNames[d])};
  });
}
export function roadmap(result,deps){return resolveDependencies(result.priorities.map(x=>x[0]),result,deps).route.map((dim,i)=>({phase:'Paso '+(i+1),dim,score:result.dimensions[dim]}));}
