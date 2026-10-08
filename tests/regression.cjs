const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const elements=new Map();const el=()=>({dataset:{},innerHTML:'',textContent:'',disabled:false,classList:{toggle(){}},appendChild(){},insertAdjacentHTML(){},setAttribute(){},addEventListener(){}});
let select,saved,confirmation=false,cleared=0;
const sandbox={console,document:{querySelector:s=>{if(!elements.has(s))elements.set(s,el());return elements.get(s)},querySelectorAll:()=>[],createElement:el},load:()=>({answers:{},index:0,intent:null,result:null}),save:s=>saved=JSON.parse(JSON.stringify(s)),clear:()=>cleared++,confirm:()=>confirmation,showView:()=>{},renderQuestion:o=>select=o.onSelect,bindModal:()=>{},showModal:()=>{},setupReports:()=>{},updateReport:()=>{},setupTools:()=>{}};
const ctx=vm.createContext(sandbox);
for(const f of ['engine.js','data.js','app.js']){let src=fs.readFileSync(path.join(root,'js',f),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/export /g,'');if(f==='app.js')src=src.replace(/init\(\);\s*$/,'');vm.runInContext(src,ctx)}
ctx.raw=JSON.parse(fs.readFileSync(path.join(root,'data/questions.json')));ctx.levels=JSON.parse(fs.readFileSync(path.join(root,'data/maturity.json')));
vm.runInContext('questions=normalizeAssessment(raw);maturity=levels;dims=[...new Set(questions.map(q=>q.dimension))];state.answers=Object.fromEntries(questions.map(q=>[q.id,50]));refreshResult();showQuestion()',ctx);
assert.equal(elements.get('#score').textContent,50);
const q=vm.runInContext('questions[38]',ctx);select(q,100);
assert.equal(saved.result.overall,51);assert.equal(saved.result.dimensions.ai,60);assert.equal(elements.get('#score').textContent,51);
console.log('PASS: editar respuesta actualiza resultado y estado persistido sin finalizar');
vm.runInContext('delete state.answers[questions[0].id];refreshResult()',ctx);assert.equal(vm.runInContext('state.result',ctx),null);assert.equal(elements.get('#resultNav').disabled,true);
console.log('PASS: diagnóstico incompleto invalida resultado');
vm.runInContext('state.answers=Object.fromEntries(questions.map(q=>[q.id,50]));state.answers[questions[0].id]=999;refreshResult()',ctx);assert.equal(vm.runInContext('state.result',ctx),null);
console.log('PASS: valores fuera de niveles no generan resultado');
vm.runInContext('state.answers=Object.fromEntries(questions.map(q=>[q.id,50]));refreshResult();bind()',ctx);elements.get('#resetAssessment').onclick();assert.equal(vm.runInContext('Object.keys(state.answers).length',ctx),40);
confirmation=true;elements.get('#resetAssessment').onclick();assert.equal(vm.runInContext('Object.keys(state.answers).length',ctx),0);assert.equal(vm.runInContext('state.index',ctx),0);assert.equal(elements.get('#resultNav').disabled,true);assert.equal(cleared,1);
console.log('PASS: cancelar conserva respuestas; confirmar reinicia y deshabilita resultado');

// Run the real navigation handlers through all 40 answers at each permitted level.
for(const score of [25,50,75,100]){
 ctx.testScore=score;
 vm.runInContext('state={answers:{},index:0,intent:null,result:null,context:{}};bind();showQuestion()',ctx);
 for(let i=0;i<40;i++){
  assert.equal(vm.runInContext('state.index',ctx),i);
  const question=vm.runInContext('questions[state.index]',ctx);select(question,score);
  elements.get('#next').onclick();
 }
 assert.equal(saved.result.overall,score);
 assert.equal(Object.keys(saved.answers).length,40);
 for(const d of Object.values(saved.result.dimensions))assert.equal(d,score);
 console.log(`PASS: recorrido completo 40 preguntas al nivel ${score}`);
}
const reports=vm.createContext({Date,Number,Error});
vm.runInContext(fs.readFileSync(path.join(root,'js/report.js'),'utf8').replace(/export /g,''),reports);
reports.input={state:saved,questions:vm.runInContext('questions',ctx)};
const report=vm.runInContext('buildReport(input,new Date("2026-10-07T12:00:00Z"))',reports);
assert.equal(report.answers.length,40);assert.equal(report.signal,'Verde');assert.equal(report.dimensions.length,8);
console.log('PASS: reporte estructurado con 40 respuestas y 8 dimensiones');
