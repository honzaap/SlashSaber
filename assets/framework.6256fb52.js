import{c as L,a as F,b as N,d as O,e as B,f as W,D as M,g as T,T as S,I as A,L as k,h as b}from"./layout.efa9b945.js";import{u as de,i as me,j as ge,k as ye,l as Me,m as Te}from"./layout.efa9b945.js";import{c as C,m as p,I as U}from"./globals.7485f94b.js";import{X as P,aX as G}from"./runtime-core.esm-bundler.42c6fcfe.js";const D={"001":1,AD:1,AE:6,AF:6,AG:0,AI:1,AL:1,AM:1,AN:1,AR:1,AS:0,AT:1,AU:1,AX:1,AZ:1,BA:1,BD:0,BE:1,BG:1,BH:6,BM:1,BN:1,BR:0,BS:0,BT:0,BW:0,BY:1,BZ:0,CA:0,CH:1,CL:1,CM:1,CN:1,CO:0,CR:1,CY:1,CZ:1,DE:1,DJ:6,DK:1,DM:0,DO:0,DZ:6,EC:1,EE:1,EG:6,ES:1,ET:0,FI:1,FJ:1,FO:1,FR:1,GB:1,"GB-alt-variant":0,GE:1,GF:1,GP:1,GR:1,GT:0,GU:0,HK:0,HN:0,HR:1,HU:1,ID:0,IE:1,IL:0,IN:0,IQ:6,IR:6,IS:1,IT:1,JM:0,JO:6,JP:0,KE:0,KG:1,KH:0,KR:0,KW:6,KZ:1,LA:0,LB:1,LI:1,LK:1,LT:1,LU:1,LV:1,LY:6,MC:1,MD:1,ME:1,MH:0,MK:1,MM:0,MN:1,MO:0,MQ:1,MT:0,MV:5,MX:0,MY:1,MZ:0,NI:0,NL:1,NO:1,NP:0,NZ:1,OM:6,PA:0,PE:0,PH:0,PK:0,PL:1,PR:0,PT:0,PY:0,QA:6,RE:1,RO:1,RS:1,RU:1,SA:0,SD:6,SE:1,SG:0,SI:1,SK:1,SM:1,SV:0,SY:6,TH:0,TJ:1,TM:1,TR:1,TT:0,TW:0,UA:1,UM:0,US:0,UY:1,UZ:1,VA:1,VE:0,VI:0,VN:1,WS:0,XK:1,YE:0,ZA:0,ZW:0};function H(t,e){const n=[];let r=[];const a=w(t),c=E(t),f=a.getDay()-D[e.slice(-2).toUpperCase()],h=c.getDay()-D[e.slice(-2).toUpperCase()];for(let s=0;s<f;s++){const i=new Date(a);i.setDate(i.getDate()-(f-s)),r.push(i)}for(let s=1;s<=c.getDate();s++){const i=new Date(t.getFullYear(),t.getMonth(),s);r.push(i),r.length===7&&(n.push(r),r=[])}for(let s=1;s<7-h;s++){const i=new Date(c);i.setDate(i.getDate()+s),r.push(i)}return n.push(r),n}function w(t){return new Date(t.getFullYear(),t.getMonth(),1)}function E(t){return new Date(t.getFullYear(),t.getMonth()+1,0)}function K(t){if(t==null)return new Date;if(t instanceof Date)return t;if(typeof t=="string"){const e=Date.parse(t);if(!isNaN(e))return new Date(e)}return null}const Y=new Date(2e3,0,2);function Z(t){const e=D[t.slice(-2).toUpperCase()];return C(7).map(n=>{const r=new Date(Y);return r.setDate(Y.getDate()+e+n),new Intl.DateTimeFormat(t,{weekday:"short"}).format(r)})}function V(t,e,n){const r=new Date(t);let a={};switch(e){case"fullDateWithWeekday":a={weekday:"long",day:"numeric",month:"long",year:"numeric"};break;case"normalDateWithWeekday":a={weekday:"short",day:"numeric",month:"short"};break;case"keyboardDate":a={};break;case"monthAndDate":a={month:"long",day:"numeric"};break;case"monthAndYear":a={month:"long",year:"numeric"};break;case"dayOfMonth":a={day:"numeric"};break;default:a={timeZone:"UTC",timeZoneName:"short"}}return new Intl.DateTimeFormat(n,a).format(r)}function x(t,e){const n=new Date(t);return n.setDate(n.getDate()+e),n}function J(t,e){const n=new Date(t);return n.setMonth(n.getMonth()+e),n}function j(t){return t.getFullYear()}function z(t){return t.getMonth()}function X(t){return new Date(t.getFullYear(),0,1)}function $(t){return new Date(t.getFullYear(),11,31)}function Q(t,e){return d(t,e[0])&&_(t,e[1])}function q(t){const e=new Date(t);return e instanceof Date&&!isNaN(e.getTime())}function d(t,e){return t.getTime()>e.getTime()}function _(t,e){return t.getTime()<e.getTime()}function I(t,e){return t.getTime()===e.getTime()}function ee(t,e){return t.getDate()===e.getDate()&&t.getMonth()===e.getMonth()&&t.getFullYear()===e.getFullYear()}function te(t,e){return t.getMonth()===e.getMonth()&&t.getFullYear()===e.getFullYear()}function ne(t,e,n){const r=new Date(t),a=new Date(e);return n==="month"?r.getMonth()-a.getMonth()+(r.getFullYear()-a.getFullYear())*12:Math.floor((r.getTime()-a.getTime())/(1e3*60*60*24))}function re(t,e){const n=new Date(t);return n.setFullYear(e),n}class ae{constructor(e){this.locale=e.locale}date(e){return K(e)}toJsDate(e){return e}addDays(e,n){return x(e,n)}addMonths(e,n){return J(e,n)}getWeekArray(e){return H(e,this.locale)}startOfMonth(e){return w(e)}endOfMonth(e){return E(e)}format(e,n){return V(e,n,this.locale)}isEqual(e,n){return I(e,n)}isValid(e){return q(e)}isWithinRange(e,n){return Q(e,n)}isAfter(e,n){return d(e,n)}isBefore(e,n){return!d(e,n)&&!I(e,n)}isSameDay(e,n){return ee(e,n)}isSameMonth(e,n){return te(e,n)}setYear(e,n){return re(e,n)}getDiff(e,n,r){return ne(e,n,r)}getWeekdays(){return Z(this.locale)}getYear(e){return j(e)}getMonth(e){return z(e)}startOfYear(e){return X(e)}endOfYear(e){return $(e)}}const R=Symbol.for("vuetify:date-adapter");function se(t){return p({adapter:ae,locale:{af:"af-ZA",bg:"bg-BG",ca:"ca-ES",ckb:"",cs:"",de:"de-DE",el:"el-GR",en:"en-US",et:"et-EE",fa:"fa-IR",fi:"fi-FI",hr:"hr-HR",hu:"hu-HU",he:"he-IL",id:"id-ID",it:"it-IT",ja:"ja-JP",ko:"ko-KR",lv:"lv-LV",lt:"lt-LT",nl:"nl-NL",no:"nn-NO",pl:"pl-PL",pt:"pt-PT",ro:"ro-RO",ru:"ru-RU",sk:"sk-SK",sl:"sl-SI",srCyrl:"sr-SP",srLatn:"sr-SP",sv:"sv-SE",th:"th-TH",tr:"tr-TR",az:"az-AZ",uk:"uk-UA",vi:"vi-VN",zhHans:"zh-CN",zhHant:"zh-TW"}},t)}function oe(){let t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};const{blueprint:e,...n}=t,r=p(e,n),{aliases:a={},components:c={},directives:f={}}=r,h=L(r.defaults),s=F(r.display,r.ssr),i=N(r.theme),m=O(r.icons),g=B(r.locale),y=se(r.date);return{install:o=>{for(const u in f)o.directive(u,f[u]);for(const u in c)o.component(u,c[u]);for(const u in a)o.component(u,W({...a[u],name:u,aliasName:a[u].name}));if(i.install(o),o.provide(M,h),o.provide(T,s),o.provide(S,i),o.provide(A,m),o.provide(k,g),o.provide(R,y),U&&r.ssr)if(o.$nuxt)o.$nuxt.hook("app:suspense:resolve",()=>{s.update()});else{const{mount:u}=o;o.mount=function(){const v=u(...arguments);return P(()=>s.update()),o.mount=u,v}}b.reset(),o.mixin({computed:{$vuetify(){return G({defaults:l.call(this,M),display:l.call(this,T),theme:l.call(this,S),icons:l.call(this,A),locale:l.call(this,k),date:l.call(this,R)})}}})},defaults:h,display:s,theme:i,icons:m,locale:g,date:y}}const ie="3.3.6";oe.version=ie;function l(t){var r,a,c;const e=this.$,n=(c=(r=e.parent)==null?void 0:r.provides)!=null?c:(a=e.vnode.appContext)==null?void 0:a.provides;if(n&&t in n)return n[t]}export{oe as createVuetify,de as useDefaults,me as useDisplay,ge as useLayout,ye as useLocale,Me as useRtl,Te as useTheme,ie as version};