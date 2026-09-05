export type MailSuggestion={id:string;kind:'task'|'appointment';title:string;date?:string;time?:string;endTime?:string;location?:string;reason:string;selected:boolean}
const months:Record<string,number>={januar:0,februar:1,märz:2,maerz:2,april:3,mai:4,juni:5,juli:6,august:7,september:8,oktober:9,november:10,dezember:11}
const iso=(d:Date)=>d.toISOString().slice(0,10)
function dateFrom(text:string){const numeric=text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/);if(numeric){let y=+numeric[3];if(y<100)y+=2000;return iso(new Date(y,+numeric[2]-1,+numeric[1],12))}const named=text.toLowerCase().match(/\b(\d{1,2})\.\s*(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)(?:\s+(\d{4}))?/);if(named)return iso(new Date(+(named[3]??new Date().getFullYear()),months[named[2]],+named[1],12));const d=new Date();if(/\bheute\b/i.test(text))return iso(d);if(/\bmorgen\b/i.test(text)){d.setDate(d.getDate()+1);return iso(d)}return undefined}
const clean=(s:string)=>s.replace(/^(bitte|könnten sie|kannst du|ich bitte sie,?)\s*/i,'').replace(/[.!?]+$/,'').trim()
export function analyseMail(subject:string,body:string):MailSuggestion[]{
  const sentences=body.replace(/\r/g,' ').split(/\n+|[!?]\s+|(?<!\d)\.\s+/).map(s=>s.trim()).filter(Boolean),out:MailSuggestion[]=[]
  for(const sentence of sentences){
    const date=dateFrom(sentence)
    const time=sentence.match(/\b(?:um\s*)?(\d{1,2})(?:(?:[:.])(\d{2})(?:\s*Uhr)?|\s*Uhr)\b/i)
    const endTime=sentence.match(/(?:-|–|bis)\s*(\d{1,2})[:.]?(\d{2})?(?:\s*Uhr)?\b/i)
    const location=sentence.match(/(?:in|im|raum)\s+([A-ZÄÖÜ][\wÄÖÜäöüß -]{2,35})(?:[,.]|$)/)?.[1]?.trim()
    const action=/(bitte|frist|bis zum|erledigen|prüfen|antworten|vorbereiten|zusenden|einreichen|organisieren|erstellen|versenden|schicken|senden sie|denken sie daran)/i.test(sentence)
    const meeting=/(termin|besprechung|konferenz|sitzung|gespräch|treffen|einladung)/i.test(`${subject} ${sentence}`)
    if(action){out.push({id:crypto.randomUUID(),kind:'task',title:clean(sentence).slice(0,180),date,reason:date?'Handlungsaufforderung mit Frist erkannt':'Handlungsaufforderung erkannt',selected:true});continue}
    if(meeting&&(date||time))out.push({id:crypto.randomUUID(),kind:'appointment',title:clean(subject||sentence).slice(0,90),date,time:time?`${time[1].padStart(2,'0')}:${time[2]??'00'}`:undefined,endTime:endTime?`${endTime[1].padStart(2,'0')}:${endTime[2]??'00'}`:undefined,location,reason:'Datum oder Uhrzeit in einer Terminpassage erkannt',selected:true})
  }
  return out.filter((item,index)=>out.findIndex(x=>x.kind===item.kind&&x.title===item.title&&x.date===item.date)===index)
}

export function reconcileAISuggestions(subject:string,body:string,ai:MailSuggestion[]):MailSuggestion[]{
  const deterministic=analyseMail(subject,body),knownDates=new Set(deterministic.map(item=>item.date).filter(Boolean))
  const calendarNotification=/(termin(?:einladung)?\s*(?:wurde\s*)?(?:aktualisiert|geändert)|aktualisierte\s+termineinladung|diese e-mail wurde automatisch generiert)/i.test(`${subject}\n${body}`)
  const deterministicTasks=deterministic.filter(item=>item.kind==='task')
  const safeAI=ai.filter(item=>!(calendarNotification&&item.kind==='task')&&!(deterministicTasks.length&&item.kind==='task')).map(item=>item.date&&!knownDates.has(item.date)?{...item,date:undefined}:item)
  const combined=calendarNotification?[...deterministic.filter(item=>item.kind==='appointment')]:[...safeAI,...deterministic.filter(rule=>!safeAI.some(item=>item.kind===rule.kind&&item.date===rule.date&&(item.kind!=='appointment'||item.time===rule.time)))]
  return combined.filter((item,index)=>combined.findIndex(other=>other.kind===item.kind&&other.title.toLowerCase()===item.title.toLowerCase()&&(other.date??'')===(item.date??''))===index)
}
