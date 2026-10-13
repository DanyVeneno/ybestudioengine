import {QUESTIONNAIRE_VERSION,METHODOLOGY_VERSION,DIMENSIONS} from './data.js';
import {calculate,registered} from './engine.js';
export const KEY='ybe-assessments-v2',LEGACY_KEY='ybe-v5-state',SCHEMA_VERSION=2;
const ids=DIMENSIONS.flatMap(d=>[1,2,3,4,5].map(i=>d+'-'+i));
const questions=ids.map(id=>({id,dimension:id.slice(0,id.lastIndexOf('-'))}));
const iso=()=>new Date().toISOString();
const clone=x=>JSON.parse(JSON.stringify(x));
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const str=(s,max=10000)=>typeof s==='string'&&s.length<=max;
const date=d=>d===null||(str(d,40)&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString()===(d.includes('.')?d:d.replace('Z','.000Z')));
const day=d=>d===''||(/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d);
function require(ok,message){if(!ok)throw new Error(message);}
function safeTree(x,depth=0){
  require(depth<30,'JSON demasiado profundo.');
  if(x&&typeof x==='object')for(const [k,v] of Object.entries(x)){
    require(!['__proto__','prototype','constructor'].includes(k),'Clave JSON no permitida.');safeTree(v,depth+1);
  }
}
const validIntent=i=>i===null||['growth','experience','process','digital','automation','ai','unknown'].includes(i);
const validContext=c=>object(c)&&['businessName','businessSize','digitalState','businessChallenge'].every(k=>str(c[k],5000));
const validAction=a=>object(a)&&str(a.id,100)&&a.id.length>0&&str(a.description,5000)&&str(a.owner,500)&&str(a.targetDate,10)&&day(a.targetDate)&&['pending','in_progress','completed'].includes(a.status);
function validAnswer(a,allowDraft=false) {
  return object(a)&&['scored','unknown',...(allowDraft?['pending']:[])].includes(a.status)&&
    (a.status==='scored'?[25,50,75,100].includes(a.value):a.value===null)&&str(a.note,5000)&&date(a.answeredAt)&&
    (a.status==='pending'||typeof a.answeredAt==='string');
}
export function newAssessment(overrides={}) {
  const now=iso();
  return {schemaVersion:SCHEMA_VERSION,assessmentId:globalThis.crypto?.randomUUID?.()||'ybe-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),
    questionnaireVersion:QUESTIONNAIRE_VERSION,methodologyVersion:METHODOLOGY_VERSION,createdAt:now,updatedAt:now,closedAt:null,status:'draft',
    intent:null,context:{businessName:'',businessSize:'',digitalState:'',businessChallenge:''},answers:{},revisions:[],result:null,coverage:null,
    actions:[],index:0,stage:'context',needsReview:[],...overrides};
}
export function validateAssessment(s) {
  require(object(s)&&s.schemaVersion===SCHEMA_VERSION,'Esquema de diagnóstico incompatible.');
  require(str(s.assessmentId,100)&&/^[a-zA-Z0-9-]{5,100}$/.test(s.assessmentId),'ID inválido.');
  const legacy=s.questionnaireVersion==='YBE-V5-40Q-1'&&s.methodologyVersion==='YBE-V5-40Q-1';
  require(legacy||(s.questionnaireVersion===QUESTIONNAIRE_VERSION&&s.methodologyVersion===METHODOLOGY_VERSION),'Versión de metodología incompatible.');
  require(['draft','finalized'].includes(s.status)&&date(s.createdAt)&&date(s.updatedAt)&&date(s.closedAt),'Estado o fechas inválidos.');
  require(s.status!=='finalized'||typeof s.closedAt==='string'||legacy,'Falta fecha de cierre.');
  require(validIntent(s.intent),'Objetivo inválido.');
  require(validContext(s.context),'Contexto inválido.');
  require(object(s.answers)&&Object.keys(s.answers).length<=40,'Respuestas inválidas.');
  for(const [id,a] of Object.entries(s.answers))require(ids.includes(id)&&validAnswer(a,true),'Respuesta inválida: '+id);
  require(Array.isArray(s.revisions)&&s.revisions.length<=10000,'Historial inválido.');
  for(const r of s.revisions){
    require(object(r)&&date(r.at)&&typeof r.at==='string'&&['answer','context','action','close','copy'].includes(r.type),'Revisión inválida.');
    if(r.type==='answer')require(ids.includes(r.questionId)&&(r.before===null||validAnswer(r.before,true))&&validAnswer(r.after,true),'Revisión de respuesta inválida.');
    if(r.type==='context')require([r.before,r.after].every(x=>object(x)&&validIntent(x.intent)&&validContext(x.context)),'Revisión de contexto inválida.');
    if(r.type==='action')require(str(r.actionId,100)&&(r.before===null||validAction(r.before))&&(r.after===null||validAction(r.after)),'Revisión de acción inválida.');
    if(r.type==='copy')require(str(r.source,100)&&/^[a-zA-Z0-9-]{5,100}$/.test(r.source),'Origen de copia inválido.');
  }
  require(Array.isArray(s.actions)&&s.actions.length<=100,'Acciones inválidas.');
  s.actions.forEach(a=>require(validAction(a),'Acción inválida.'));
  require(new Set(s.actions.map(a=>a.id)).size===s.actions.length,'Acciones duplicadas.');
  require(Number.isInteger(s.index)&&s.index>=0&&s.index<40&&['context','intro','question','summary','review','results'].includes(s.stage),'Navegación inválida.');
  require(Array.isArray(s.needsReview)&&s.needsReview.every(id=>ids.includes(id)),'Preguntas para revisar inválidas.');
  if(legacy)require(object(s.legacy)&&object(s.legacy.original)&&typeof s.legacy.migratedAt==='string'&&date(s.legacy.migratedAt),'Migración inválida.');
  if(!legacy){
    require(['','emprendimiento','pequena','mediana','grande','institucion'].includes(s.context.businessSize)&&
      ['','inicio','herramientas','integracion','automatizacion','inteligencia'].includes(s.context.digitalState),'Valor de contexto inválido.');
    require(s.status==='finalized'||s.closedAt===null,'Un borrador no puede tener fecha de cierre.');
    require(s.createdAt!==null&&s.updatedAt!==null,'Faltan fechas.');
    if(s.status==='finalized')require(questions.every(q=>registered(s.answers[q.id]))&&object(s.result),'Cierre incompleto.');
    if(s.result!==null){
      const computed=calculate(questions,s.answers);
      require(object(s.result)&&s.result.overall===computed.overall&&object(s.result.dimensions)&&object(s.result.coverage),'Resultado inválido.');
      for(const d of DIMENSIONS)require(s.result.dimensions[d]===computed.dimensions[d]&&
        s.result.coverage[d]?.scored===computed.coverage[d].scored&&s.result.coverage[d]?.total===5&&
        s.result.coverage[d]?.responded===computed.coverage[d].responded,'Resultado inconsistente.');
      require(object(s.coverage)&&DIMENSIONS.every(d=>s.coverage[d]?.scored===computed.coverage[d].scored&&s.coverage[d]?.responded===computed.coverage[d].responded&&s.coverage[d]?.total===5),'Cobertura inconsistente.');
      // Only our own calculation and locally generated recommendations are displayed for current versions.
    }
  }
  safeTree(s);
  return clone(s);
}
export function emptyLibrary(){return {schemaVersion:SCHEMA_VERSION,activeId:null,assessments:[],legacyMigrated:false};}
export function validateLibrary(data) {
  require(object(data)&&data.schemaVersion===SCHEMA_VERSION&&Array.isArray(data.assessments)&&data.assessments.length<=200,'Biblioteca inválida.');
  data.assessments.forEach(validateAssessment);
  require(new Set(data.assessments.map(s=>s.assessmentId)).size===data.assessments.length,'IDs duplicados.');
  require(data.activeId===null||data.assessments.some(s=>s.assessmentId===data.activeId),'Diagnóstico activo inválido.');
  require(typeof data.legacyMigrated==='boolean','Estado de migración inválido.');
  safeTree(data);return clone(data);
}
export function migrateLegacy(original) {
  require(object(original)&&object(original.answers||{}),'Almacenamiento anterior inválido.');safeTree(original);
  const now=iso();
  return newAssessment({createdAt:null,updatedAt:null,closedAt:null,questionnaireVersion:'YBE-V5-40Q-1',methodologyVersion:'YBE-V5-40Q-1',
    intent:['growth','experience','process','digital','automation','ai','unknown'].includes(original.intent)?original.intent:null,
    context:Object.fromEntries(['businessName','businessSize','digitalState','businessChallenge'].map(k=>[k,str(original.context?.[k],5000)?original.context[k]:''])),
    status:original.result?'finalized':'draft',answers:{},result:null,coverage:null,needsReview:[...ids],
    legacy:{migratedAt:now,original:clone(original)},stage:'context'});
}
export function load(storage=localStorage) {
  const raw=storage.getItem(KEY);
  const library=raw?validateLibrary(JSON.parse(raw)):emptyLibrary();
  if(!library.legacyMigrated){
    const legacyRaw=storage.getItem(LEGACY_KEY);
    if(legacyRaw){
      require(legacyRaw.length<=2000000,'Estado anterior demasiado grande.');
      library.assessments.push(migrateLegacy(JSON.parse(legacyRaw)));library.legacyMigrated=true;
      save(library,storage); // Original legacy key remains untouched; migration becomes visible only after successful save.
    }
  }
  return library;
}
export function save(library,storage=localStorage) {storage.setItem(KEY,JSON.stringify(validateLibrary(library)));}
export function put(library,s) {
  const valid=validateAssessment(s),i=library.assessments.findIndex(x=>x.assessmentId===s.assessmentId);
  if(i<0)library.assessments.push(valid);else library.assessments[i]=valid;
  library.activeId=s.assessmentId;
}
export function copyForEditing(s) {
  const old=s.questionnaireVersion!==QUESTIONNAIRE_VERSION;
  const copy=newAssessment({intent:s.intent,context:clone(s.context),answers:old?{}:clone(s.answers),actions:clone(s.actions),
    needsReview:old?[...ids]:[...s.needsReview],copiedFrom:s.assessmentId,legacy:s.legacy?clone(s.legacy):undefined});
  copy.revisions.push({type:'copy',at:iso(),source:s.assessmentId});return copy;
}
export function updateAnswer(s,id,status,value,note,confirmChange=true) {
  require(s.status==='draft'&&ids.includes(id),'El diagnóstico cerrado debe copiarse antes de editar.');
  const previous=s.answers[id]||null;
  const next={status,value:status==='scored'?value:null,note:note??previous?.note??'',answeredAt:status==='pending'?null:iso()};
  require(validAnswer(next,true),'Respuesta inválida.');
  const significant=!previous||previous.status!==next.status||previous.value!==next.value||previous.note!==next.note;
  if(!significant)return;
  s.answers[id]=next;s.updatedAt=iso();s.result=null;s.coverage=null;
  if(confirmChange)s.revisions.push({type:'answer',questionId:id,at:iso(),before:clone(previous),after:clone(next)});
  s.needsReview=s.needsReview.filter(x=>x!==id);
}
export function exportDiagnostic(s,report=null) {return JSON.stringify({schemaVersion:SCHEMA_VERSION,assessment:validateAssessment(s),...(report?{report}: {})},null,2);}
export function importDiagnostic(json,library) {
  require(typeof json==='string'&&json.length<=2000000,'Archivo demasiado grande.');
  const data=JSON.parse(json);safeTree(data);
  require(object(data)&&data.schemaVersion===SCHEMA_VERSION&&object(data.assessment),'Formato JSON incompatible.');
  const s=validateAssessment(data.assessment);
  require(!library.assessments.some(x=>x.assessmentId===s.assessmentId),'El ID ya existe. No se sobrescribió ningún diagnóstico.');
  require(library.assessments.length<200,'La biblioteca alcanzó el límite de 200 diagnósticos.');
  return s; // Caller commits only after full validation.
}
export function removeAssessment(library,id){library.assessments=library.assessments.filter(s=>s.assessmentId!==id);if(library.activeId===id)library.activeId=null;}
