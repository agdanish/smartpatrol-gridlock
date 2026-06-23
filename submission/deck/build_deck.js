const pptxgen = require("pptxgenjs");
const p = new pptxgen();
p.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
p.author = "SmartPatrol"; p.title = "SmartPatrol — Gridlock Hackathon 2.0";

// ---- palette (matches the app: graphite + enforcement amber) ----
const BG="0E1116", CARD="171B22", CARD2="1E232C", LINE="2A2F3A",
      INK="ECEEF2", MID="9AA6BD", LOW="717C90",
      AMBER="F0A92E", BLUE="5B8DEF", GREEN="2DBD8A", RED="EF4444",
      VIOLET="A78BFA", TEAL="3FB6C4", ROSE="E98AA6";
const RINGS=[AMBER,BLUE,GREEN,VIOLET,TEAL,ROSE];
const HF="Arial", BFA="Arial"; // header / body
const W=13.3, H=7.5, MX=0.7;

const shadow=()=>({type:"outer",color:"000000",blur:9,offset:3,angle:90,opacity:0.35});
function base(s,{dark=true}={}){ s.background={color:dark?BG:BG}; }
function foot(s,n){
  s.addText("SmartPatrol  ·  Gridlock Hackathon 2.0",{x:MX,y:H-0.42,w:7,h:0.3,fontFace:BFA,fontSize:9,color:LOW,align:"left",margin:0});
  s.addText(String(n).padStart(2,"0"),{x:W-1.2,y:H-0.42,w:0.5,h:0.3,fontFace:BFA,fontSize:9,color:LOW,align:"right",margin:0});
}
function kick(s,t){ s.addText(t.toUpperCase(),{x:MX,y:0.55,w:11,h:0.3,fontFace:HF,fontSize:12,bold:true,color:AMBER,charSpacing:3,margin:0}); }
function title(s,t,opt={}){ s.addText(t,{x:MX,y:0.95,w:opt.w||11.9,h:opt.h||1.0,fontFace:HF,fontSize:opt.fs||32,bold:true,color:INK,align:"left",valign:"top",margin:0,lineSpacingMultiple:0.98}); }
function card(s,x,y,w,h,fill=CARD){ s.addShape(p.shapes.ROUNDED_RECTANGLE,{x,y,w,h,fill:{color:fill},line:{color:LINE,width:1},rectRadius:0.09,shadow:shadow()}); }
// big stat block
function stat(s,x,y,w,val,lab,sub,color=AMBER){
  card(s,x,y,w,1.95);
  const L=String(val).length, fs = L<=4?38 : L<=6?31 : L<=8?25 : 21; // auto-scale so long values never overflow
  s.addText(val,{x:x+0.05,y:y+0.18,w:w-0.1,h:0.95,fontFace:HF,fontSize:fs,bold:true,color,align:"center",valign:"middle",margin:0});
  s.addText(lab,{x:x+0.15,y:y+1.12,w:w-0.3,h:0.4,fontFace:BFA,fontSize:12.5,bold:true,color:INK,align:"center",margin:0});
  if(sub) s.addText(sub,{x:x+0.15,y:y+1.5,w:w-0.3,h:0.4,fontFace:BFA,fontSize:10,color:MID,align:"center",margin:0,lineSpacingMultiple:0.95});
}
function caption(s,t,y){ s.addText(t,{x:MX,y:y||(H-1.25),w:11.9,h:0.7,fontFace:BFA,fontSize:13,color:MID,align:"left",margin:0,lineSpacingMultiple:1.04}); }

// ============================ SLIDE 1 — TITLE ============================
let s=p.addSlide(); base(s);
// constellation accent (top-right cluster of dots)
const cc=[[10.4,1.5],[11.5,1.1],[12.2,2.0],[10.9,2.4],[11.9,2.8],[10.2,2.9]];
cc.forEach((c,i)=>{ for(let k=0;k<5;k++){ const a=Math.random()*6.28,r=0.18+Math.random()*0.55;
  s.addShape(p.shapes.OVAL,{x:c[0]+Math.cos(a)*r,y:c[1]+Math.sin(a)*r*0.8,w:0.13+Math.random()*0.12,h:0.13+Math.random()*0.12,fill:{color:RINGS[i],transparency:25},line:{type:"none"}}); } });
s.addText("SmartPatrol",{x:MX,y:2.35,w:9,h:1.0,fontFace:HF,fontSize:60,bold:true,color:INK,margin:0});
s.addText("Predictive Enforcement Deployment Brain — for Bengaluru Traffic Police",{x:MX,y:3.45,w:9.5,h:0.5,fontFace:HF,fontSize:19,color:AMBER,margin:0});
s.addText([
  {text:"298,450 real BTP records ",options:{bold:true,color:INK}},
  {text:"→ tomorrow's patrol plan.  Sensor-free.  Audit-grade.",options:{color:MID}},
],{x:MX,y:4.15,w:10.5,h:0.5,fontFace:BFA,fontSize:15,margin:0});
s.addText("Gridlock Hackathon 2.0   ·   Phase 2 / 3   ·   Live: smartpatrol-danish-3909s-projects.vercel.app",{x:MX,y:6.55,w:12,h:0.4,fontFace:BFA,fontSize:11.5,color:LOW,margin:0});

// ============================ SLIDE 2 — PROBLEM ============================
s=p.addSlide(); base(s); kick(s,"The problem"); title(s,"Where police patrol today is mostly a guess.");
s.addText([
 {text:"Traffic police can't be everywhere. The cost of guessing wrong isn't a missed ticket — ",options:{color:MID,breakLine:false}},
 {text:"it's a blocked footpath outside a school.",options:{color:INK,bold:true}},
],{x:MX,y:2.15,w:7.0,h:1.4,fontFace:BFA,fontSize:18,margin:0,lineSpacingMultiple:1.15});
s.addText("Meanwhile, the data to fix it already exists — and sits unused.",{x:MX,y:3.5,w:7.0,h:0.8,fontFace:BFA,fontSize:15,color:MID,margin:0});
stat(s,8.1,2.2,1.55,"298,450","tickets","real BTP records",INK);
stat(s,9.8,2.2,1.55,"54","stations","across Bengaluru",INK);
stat(s,11.5,2.2,1.25,"5,796","corners","~150 m cells",INK);
caption(s,"SmartPatrol turns that existing data into a deployable 8 AM patrol plan — with no new hardware and no new data collection.");
foot(s,2);

// ============================ SLIDE 3 — DISCOVERY ============================
s=p.addSlide(); base(s); kick(s,"The discovery"); title(s,"Fed zero geography, the data drew its own map.",{w:7.2});
// constellation: 6 clusters of dots on the right
const C=[[9.2,3.0],[10.6,2.4],[11.8,3.1],[9.8,4.2],[11.1,4.5],[12.3,3.9]];
C.forEach((c,i)=>{ for(let k=0;k<6;k++){ const a=Math.random()*6.28,r=0.15+Math.random()*0.62;
  s.addShape(p.shapes.OVAL,{x:c[0]+Math.cos(a)*r,y:c[1]+Math.sin(a)*r*0.85,w:0.16+Math.random()*0.16,h:0.16+Math.random()*0.16,fill:{color:RINGS[i],transparency:18},line:{type:"none"}}); } });
s.addText("6 rings · zero geo",{x:8.7,y:5.35,w:4,h:0.3,fontFace:BFA,fontSize:11,italic:true,color:LOW,align:"center",margin:0});
s.addText([
 {text:"We fed it only ",options:{color:MID}},
 {text:"who got ticketed, and when",options:{color:INK,bold:true}},
 {text:" — no coordinates, no map. It self-organised into ",options:{color:MID}},
 {text:"six enforcement rings",options:{color:AMBER,bold:true}},
 {text:" that snap onto Bengaluru's real geography.",options:{color:MID}},
],{x:MX,y:2.2,w:7.0,h:1.7,fontFace:BFA,fontSize:17,margin:0,lineSpacingMultiple:1.15});
stat(s,MX,4.4,2.05,"z = 4.8","statistically real","vs degree-preserving null",AMBER);
stat(s,2.95,4.4,2.05,"1.79×","tighter than chance","5.7 km vs 10.2 km apart",BLUE);
stat(s,5.2,4.4,2.0,"0.41","modularity","6 communities found",GREEN);
foot(s,3);

// ============================ SLIDE 4 — MODEL ============================
s=p.addSlide(); base(s); kick(s,"The model"); title(s,"It predicts where violations cluster next.");
s.addChart(p.charts.BAR,[{name:"AUC",labels:["SmartPatrol model","Do-nothing baseline"],values:[0.797,0.711]}],{
  x:MX,y:2.3,w:6.6,h:4.0,barDir:"bar",chartColors:[AMBER,LOW],chartArea:{fill:{color:BG}},plotArea:{fill:{color:BG}},
  valAxisHidden:true,catAxisLabelColor:INK,catAxisLabelFontFace:BFA,catAxisLabelFontSize:13,
  showValue:true,dataLabelColor:INK,dataLabelFontSize:16,dataLabelFontBold:true,dataLabelPosition:"outEnd",
  valAxisMinVal:0,valAxisMaxVal:1,showLegend:false,catGridLine:{style:"none"},valGridLine:{style:"none"},barGapWidthPct:60});
stat(s,8.0,2.5,2.45,"0.80","AUC, out-of-time","validated on weeks it never saw",AMBER);
stat(s,10.55,2.5,2.05,"0.79–0.80","95% CI","1,000-sample bootstrap",BLUE);
caption(s,"Trained on the first weeks, scored on the last — a real out-of-time test, not a fit to its own data. It beats the do-nothing baseline by a clear, bootstrap-confirmed margin.",H-1.15);
foot(s,4);

// ============================ SLIDE 5 — CONFORMAL ============================
s=p.addSlide(); base(s); kick(s,"Responsible AI"); title(s,"It knows what it doesn't know.");
s.addText([
 {text:"When the model isn't confident, it ",options:{color:MID}},
 {text:"declines to call a corner",options:{color:INK,bold:true}},
 {text:" — rather than guess. A conformal abstention layer with a distribution-free guarantee.",options:{color:MID}},
],{x:MX,y:2.15,w:7.0,h:1.5,fontFace:BFA,fontSize:18,margin:0,lineSpacingMultiple:1.15});
stat(s,8.1,2.15,2.2,"9,667","corner-weeks declined","abstains rather than guess",AMBER);
stat(s,10.45,2.15,2.15,"≤ 10%","guaranteed miss rate","measured 7.6% out-of-time",GREEN);
s.addText([
 {text:"The honest answer to the predictive-policing critique.  ",options:{color:INK,bold:true}},
 {text:"SmartPatrol scores PLACES, never individuals.",options:{color:MID}},
],{x:MX,y:5.2,w:11.9,h:0.6,fontFace:BFA,fontSize:15,margin:0});
foot(s,5);

// ============================ SLIDE 6 — NOT JUST RECENCY ============================
s=p.addSlide(); base(s); kick(s,"Rigor"); title(s,"Not “just recency” — we tested it.");
s.addChart(p.charts.BAR,[{name:"AUC",labels:["Full model","Drop EWMA","Strip ALL recency","Baseline"],values:[0.797,0.798,0.774,0.711]}],{
  x:MX,y:2.3,w:7.4,h:4.0,barDir:"col",chartColors:[AMBER,AMBER,BLUE,LOW],chartArea:{fill:{color:BG}},plotArea:{fill:{color:BG}},
  valAxisHidden:true,catAxisLabelColor:MID,catAxisLabelFontFace:BFA,catAxisLabelFontSize:11.5,
  showValue:true,dataLabelColor:INK,dataLabelFontSize:14,dataLabelFontBold:true,dataLabelPosition:"outEnd",
  valAxisMinVal:0.6,valAxisMaxVal:0.85,showLegend:false,catGridLine:{style:"none"},valGridLine:{style:"none"},barGapWidthPct:45});
s.addText([
 {text:"Strip out ",options:{color:MID}},
 {text:"every recency feature",options:{color:INK,bold:true}},
 {text:" and it ",options:{color:MID}},
 {text:"still scores 0.77",options:{color:BLUE,bold:true}},
 {text:", beating the baseline by +0.06.",options:{color:MID}},
],{x:8.3,y:2.7,w:4.3,h:1.6,fontFace:BFA,fontSize:16,margin:0,lineSpacingMultiple:1.15});
s.addText("The model captures real structure — not just “busy stays busy.”",{x:8.3,y:4.5,w:4.3,h:1.0,fontFace:BFA,fontSize:13,italic:true,color:MID,margin:0,lineSpacingMultiple:1.1});
foot(s,6);

// ============================ SLIDE 7 — SAFETY (PEAK) ============================
s=p.addSlide(); base(s); kick(s,"The impact"); title(s,"A safer city is a re-ranking away.");
s.addChart(p.charts.BAR,[{name:"Coverage",labels:["Rank by volume","Rank by harm (ours)"],values:[32.7,47.8]}],{
  x:MX,y:2.3,w:6.4,h:4.0,barDir:"col",chartColors:[LOW,GREEN],chartArea:{fill:{color:BG}},plotArea:{fill:{color:BG}},
  valAxisHidden:true,catAxisLabelColor:INK,catAxisLabelFontFace:BFA,catAxisLabelFontSize:13,
  showValue:true,dataLabelColor:INK,dataLabelFontSize:18,dataLabelFontBold:true,dataLabelPosition:"outEnd",dataLabelFormatCode:'0.0"%"',
  valAxisMinVal:0,valAxisMaxVal:60,showLegend:false,catGridLine:{style:"none"},valGridLine:{style:"none"},barGapWidthPct:70});
stat(s,7.9,2.4,2.3,"+15.1 pp","pedestrian-safety coverage","footpaths · schools · crossings",GREEN);
stat(s,10.35,2.4,2.25,"₹0","extra cost","same 142 corners, same officers",AMBER);
caption(s,"Re-rank the same plan by pedestrian harm instead of raw volume — coverage of footpaths, school-gates and crossings jumps 32.7% → 47.8%, and holds out-of-time at 46.4%. (Labeled rows.)",H-1.1);
foot(s,7);

// ============================ SLIDE 8 — CONGESTION ============================
s=p.addSlide(); base(s); kick(s,"Congestion"); title(s,"Illegal main-road parking IS the congestion.");
s.addText([
 {text:"The parking → congestion mechanism is right in the data — ",options:{color:MID}},
 {text:"no external feeds, no Theme-2 dataset.",options:{color:INK,bold:true}},
],{x:MX,y:2.15,w:11.9,h:0.7,fontFace:BFA,fontSize:17,margin:0,lineSpacingMultiple:1.1});
stat(s,MX,3.2,3.0,"8.0%","main-road parking","the direct congestion cause",AMBER);
stat(s,3.95,3.2,3.0,"375","repeat offenders","≥80% at ONE corner — junctions choked again and again",BLUE);
stat(s,7.2,3.2,3.0,"5/5","PEHI harm weight","main-road corners top the plan",GREEN);
caption(s,"SmartPatrol already prioritises the corners that cause congestion — and surfaces the repeat vehicles choking them.",H-1.1);
foot(s,8);

// ============================ SLIDE 9 — INTEGRITY ============================
s=p.addSlide(); base(s); kick(s,"Trust"); title(s,"Every number reproduces by one command.");
stat(s,MX,2.5,2.6,"15 / 15","headline claims verified","regenerated from the raw CSV",GREEN);
card(s,3.6,2.5,9.0,1.95);
s.addText("python  src/verify_headlines.py",{x:3.8,y:2.7,w:8.6,h:0.5,fontFace:"Consolas",fontSize:16,color:GREEN,margin:0});
s.addText([
 {text:"100% from BTP's own 298,450 rows. ",options:{color:INK,bold:true}},
 {text:"Honest caveats shown up front, with a visible measured-vs-estimated seam. A tool the police act on has to be auditable, not just impressive.",options:{color:MID}},
],{x:3.8,y:3.25,w:8.5,h:1.1,fontFace:BFA,fontSize:14,margin:0,lineSpacingMultiple:1.12});
caption(s,"Data integrity is our strongest differentiator — and the first thing a government buyer's review demands.");
foot(s,9);

// ============================ SLIDE 10 — FEASIBILITY ============================
s=p.addSlide(); base(s); kick(s,"Feasibility"); title(s,"Sensor-free. ₹0 capex. Ships on owned data.");
stat(s,MX,2.4,2.5,"₹0","capital cost","no cameras, no hardware",AMBER);
stat(s,3.4,2.4,2.5,"~30 s","nightly batch","on a laptop BTP owns",BLUE);
stat(s,6.1,2.4,2.5,"8 AM","on the constable's desk","a printed duty sheet",GREEN);
// pipeline row
const steps=["BTP export","Nightly batch","Frozen plan","8 AM duty sheet"];
steps.forEach((t,i)=>{ const x=MX+i*3.0; card(s,x,4.7,2.7,0.95,CARD2);
  s.addText(t,{x:x+0.1,y:4.7,w:2.5,h:0.95,fontFace:BFA,fontSize:13,bold:true,color:INK,align:"center",valign:"middle",margin:0});
  if(i<3) s.addText("→",{x:x+2.72,y:4.7,w:0.28,h:0.95,fontFace:HF,fontSize:18,color:AMBER,align:"center",valign:"middle",margin:0}); });
caption(s,"No live AI on the street — a nightly batch turns BTP's own export into tomorrow's plan. Crash-proof: nothing computes during the demo.",H-1.0);
foot(s,10);

// ============================ SLIDE 11 — SCALABILITY ============================
s=p.addSlide(); base(s); kick(s,"Scalability"); title(s,"1 station → all 54 → any city.");
stat(s,MX,2.6,3.6,"54 → ∞","stations, ₹0 marginal cost","the pipeline already covers all of Bengaluru",AMBER);
stat(s,4.5,2.6,3.6,"6 columns","a portable data contract","any city with parking data maps in",BLUE);
stat(s,8.4,2.6,3.6,"73.9%","stable into the next period","the plan you deploy Monday is still right next month",GREEN);
caption(s,"Generalises across time (out-of-time backtest) and place (6 rings from zero geo) — what works for Bengaluru ships to any Indian city.");
foot(s,11);

// ============================ SLIDE 12 — BUSINESS ============================
s=p.addSlide(); base(s); kick(s,"Viability"); title(s,"BTP owns it. No vendor lock-in.");
stat(s,MX,2.5,3.6,"25.2×","better targeting than random","top-100 corners hold 43.5% of violations",AMBER);
stat(s,4.5,2.5,3.6,"≈ 1 salary","total run-cost / year","one constable's pay, not a SaaS bill",BLUE);
stat(s,8.4,2.5,3.6,"100%","owned by BTP","the city keeps the IP, sensor-free",GREEN);
caption(s,"Not another subscription — owned, auditable infrastructure. The value is ownership and zero lock-in, not recurring licence fees.");
foot(s,12);

// ============================ SLIDE 13 — HONEST LIMITS ============================
s=p.addSlide(); base(s); kick(s,"Honest limitations"); title(s,"What we don't claim.");
const lim=[
 ["Recency-dominated model","EWMA carries most of the weight — but it holds at 0.77 with recency stripped out, +0.06 over baseline."],
 ["Labeled-proxy safety lift","Pedestrian-class labels exist on ~10% of rows, so the 32.7→47.8% lift is on labeled rows, not a city-wide measured outcome."],
 ["Places, not people. No pilot yet","We score corners, never individuals, and we have no live-pilot outcome data — a pilot is proposed, not claimed."],
];
lim.forEach((l,i)=>{ const y=2.3+i*1.45; card(s,MX,y,11.9,1.25);
 s.addText(l[0],{x:MX+0.3,y:y+0.16,w:11.3,h:0.4,fontFace:HF,fontSize:16,bold:true,color:AMBER,margin:0});
 s.addText(l[1],{x:MX+0.3,y:y+0.58,w:11.3,h:0.6,fontFace:BFA,fontSize:13,color:MID,margin:0,lineSpacingMultiple:1.05}); });
caption(s,"We'd rather be auditable than impressive. Naming the limits is the trust signal.",H-0.95);
foot(s,13);

// ============================ SLIDE 14 — CLOSE ============================
s=p.addSlide(); base(s);
s.addText("The data was always there.",{x:MX,y:2.3,w:12,h:0.9,fontFace:HF,fontSize:40,bold:true,color:MID,margin:0});
s.addText("Now the city can act on it.",{x:MX,y:3.2,w:12,h:0.9,fontFace:HF,fontSize:40,bold:true,color:INK,margin:0});
card(s,MX,4.6,11.9,1.0,CARD2);
s.addText([
 {text:"AUC 0.80",options:{color:AMBER,bold:true}},{text:"   ·   ",options:{color:LOW}},
 {text:"z = 4.8",options:{color:BLUE,bold:true}},{text:"   ·   ",options:{color:LOW}},
 {text:"47.8% ped-safety",options:{color:GREEN,bold:true}},{text:"   ·   ",options:{color:LOW}},
 {text:"₹0 capex",options:{color:AMBER,bold:true}},{text:"   ·   ",options:{color:LOW}},
 {text:"15/15 reproducible",options:{color:GREEN,bold:true}},
],{x:MX+0.3,y:4.6,w:11.3,h:1.0,fontFace:BFA,fontSize:17,align:"center",valign:"middle",margin:0});
s.addText("Sensor-free.  Reproducible.  And it knows when to stay silent.",{x:MX,y:5.85,w:12,h:0.4,fontFace:BFA,fontSize:15,italic:true,color:MID,margin:0});
s.addText("smartpatrol-danish-3909s-projects.vercel.app/app",{x:MX,y:6.45,w:12,h:0.4,fontFace:"Consolas",fontSize:13,color:AMBER,margin:0});

p.writeFile({fileName:"/Users/danish/gridlock/submission/deck/SmartPatrol_Deck.pptx"}).then(f=>console.log("wrote",f));
