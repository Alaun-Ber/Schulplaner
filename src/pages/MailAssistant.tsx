import { useRef,useState } from 'react'
import { ArrowLeft,CalendarPlus,CheckCircle2,CircleCheck,ClipboardCheck,Inbox,LoaderCircle,Mail,RefreshCw,ScanSearch,Search,ShieldCheck,Sparkles,X } from 'lucide-react'
import { db,newId } from '../db/database'
import { analyseMail,type MailSuggestion } from '../services/mailAnalysis'
import { analyseMailWithLocalAI } from '../services/localAI'

type RecentMail={id:string;subject:string;sender:string;receivedAt:string;body:string}
type MailCategory='all'|'task'|'appointment'|'coordination'|'change'
function savedProcessed(){try{return new Set<string>(JSON.parse(localStorage.getItem('processed_mail_ids')??'[]'))}catch{return new Set<string>()}}
function savedTerms(){try{return JSON.parse(localStorage.getItem('mail_filter_terms')??'[]') as string[]}catch{return[]}}
function mailCategory(mail:RecentMail):Exclude<MailCategory,'all'>{const text=`${mail.subject} ${mail.body}`.toLowerCase();if(/aktualisiert|geändert|änderung|verschoben|abgesagt/.test(text))return'change';if(/terminabsprach|terminfind|wann passt|zeitfenster|verfügbar/.test(text))return'coordination';if(/termin|einladung|sitzung|besprechung|konferenz/.test(text))return'appointment';return'task'}
const demoSubject='Einladung zur Steuergruppensitzung und Rückmeldung'
const demoBody='Guten Tag Herr Schofer,\n\ndie nächste Steuergruppensitzung findet am 3. September 2026 um 14:30 Uhr im Konferenzraum statt. Bitte prüfen Sie die angehängte Tagesordnung und senden Sie mir Ihre Rückmeldung bis zum 31.08.2026.\n\nViele Grüße'

export function MailAssistant(){
  const[subject,setSubject]=useState(''),[body,setBody]=useState(''),[items,setItems]=useState<MailSuggestion[]>([])
  const[saved,setSaved]=useState(0),[loading,setLoading]=useState(false),[analysisNote,setAnalysisNote]=useState('')
  const[mails,setMails]=useState<RecentMail[]>([]),[mailLoading,setMailLoading]=useState(false),[mailError,setMailError]=useState('')
  const[days,setDays]=useState(3),[mailOverview,setMailOverview]=useState(false),[mailQuery,setMailQuery]=useState(''),[mailFilter,setMailFilter]=useState<MailCategory>('all')
  const[customTerms,setCustomTerms]=useState<string[]>(savedTerms),[activeTerm,setActiveTerm]=useState('')
  const[selectedMailId,setSelectedMailId]=useState(''),[processed,setProcessed]=useState(savedProcessed)
  const analysisRequest=useRef(0)

  async function analyse(nextSubject=subject,nextBody=body){
    const request=++analysisRequest.current
    setItems([]);setLoading(true);setSaved(0);setAnalysisNote('')
    try{const result=await analyseMailWithLocalAI(nextSubject,nextBody);if(request===analysisRequest.current){setItems(result);setAnalysisNote('Mit lokaler KI analysiert')}}
    catch{if(request===analysisRequest.current){setItems(analyseMail(nextSubject,nextBody));setAnalysisNote('Lokale KI nicht verfügbar – Basisanalyse verwendet')}}
    finally{if(request===analysisRequest.current)setLoading(false)}
  }
  async function loadRecentMail(nextDays=days){
    setMailOverview(true)
    setMailLoading(true);setMailError('')
    try{if(!window.schoolPlannerAI)throw new Error('Apple-Mail-Import ist nur in der Mac-App verfügbar.');setMails(await window.schoolPlannerAI.recentMail(nextDays))}
    catch(error){setMails([]);const message=error instanceof Error?error.message:'Apple Mail konnte nicht gelesen werden.';setMailError(message.replace(/^Error invoking remote method '[^']+': Error:\s*/,''))}
    finally{setMailLoading(false)}
  }
  async function selectMail(mail:RecentMail){analysisRequest.current++;setSelectedMailId(mail.id);setMailOverview(false);setSubject(mail.subject);setBody('E-Mail-Inhalt wird aus Apple Mail geladen …');setItems([]);setSaved(0);setAnalysisNote('');setLoading(true);try{if(!window.schoolPlannerAI)throw new Error('Apple Mail ist nicht verfügbar.');const content=await window.schoolPlannerAI.mailContent(mail.id);setBody(content.body);await analyse(mail.subject,content.body)}catch(error){setBody('');setLoading(false);setAnalysisNote(error instanceof Error?error.message:'E-Mail konnte nicht geladen werden.')}}
  function backToOverview(){if(selectedMailId){const next=new Set(processed).add(selectedMailId);setProcessed(next);localStorage.setItem('processed_mail_ids',JSON.stringify([...next]))}setMailOverview(true)}
  async function accept(){
    let count=0;const now=new Date().toISOString()
    for(const item of items.filter(i=>i.selected)){
      if(item.kind==='task'){await db.tasks.add({id:newId(),title:item.title,description:`Aus E-Mail: ${subject||'Ohne Betreff'}\n\n${body}\n\nErkennung: ${item.reason}`,priority:item.date?'A':'B',status:'new',dueDate:item.date,category:'E-Mail',createdAt:now,updatedAt:now});count++}
      else if(item.date){const start=`${item.date}T${item.time??'09:00'}`,endDate=new Date(start);endDate.setMinutes(endDate.getMinutes()+60);await db.appointments.add({id:newId(),title:item.title,start,end:`${item.date}T${item.endTime??endDate.toTimeString().slice(0,5)}`,location:item.location,category:'E-Mail',description:`Erkannt aus E-Mail: ${subject||'Ohne Betreff'}`});count++}
    }
    setSaved(count);setItems(old=>old.map(item=>({...item,selected:false})))
  }
  return <>
    {saved>0&&<div className="save-toast" role="status"><CheckCircle2/><div><strong>Erfolgreich übernommen</strong><span>{saved} {saved===1?'Eintrag wurde':'Einträge wurden'} gespeichert.</span></div></div>}
    <div className="section-heading"><div><p>PERSÖNLICHER ASSISTENT</p><h2>E‑Mails in Planung verwandeln</h2></div><span className="date-chip"><ShieldCheck/> Lokal auf diesem Mac</span></div>
    <div className="mail-intro"><div><Sparkles/><h3>Was steckt in dieser E‑Mail?</h3><p>Die lokale KI erkennt Aufgaben und Termine. Nichts wird ohne deine Zustimmung gespeichert.</p></div><div className="mail-intro-actions"><button className="ghost" onClick={()=>void loadRecentMail()} disabled={mailLoading}>{mailLoading?<LoaderCircle className="spin"/>:<Inbox/>} E‑Mails auswählen</button><button className="ghost" onClick={()=>{setSubject(demoSubject);setBody(demoBody);setItems([])}}>Beispiel</button></div></div>
    {mailOverview&&<MailOverview mails={mails} days={days} loading={mailLoading} error={mailError} query={mailQuery} filter={mailFilter} processed={processed} customTerms={customTerms} activeTerm={activeTerm} onDays={value=>{setDays(value);void loadRecentMail(value)}} onQuery={setMailQuery} onFilter={setMailFilter} onActiveTerm={setActiveTerm} onTerms={terms=>{setCustomTerms(terms);localStorage.setItem('mail_filter_terms',JSON.stringify(terms))}} onSelect={selectMail} onReload={()=>void loadRecentMail()} onClose={()=>setMailOverview(false)}/>}
    {selectedMailId&&<button className="ghost mail-back" onClick={backToOverview}><ArrowLeft/> Zurück zur E‑Mail-Übersicht</button>}
    <div className="mail-layout">
      <section className="mail-compose panel"><header><h3><Mail/> E‑Mail</h3></header><label>Betreff<input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Betreff der E‑Mail"/></label><label>Inhalt<textarea value={body} onChange={e=>setBody(e.target.value)} rows={14} placeholder="E‑Mail-Text hier einfügen …"/></label><button className="primary full" disabled={loading||(!subject.trim()&&!body.trim())} onClick={()=>void analyse()}>{loading?<LoaderCircle className="spin"/>:<ScanSearch/>} {loading?'Lokale KI analysiert …':'E‑Mail analysieren'}</button><small className="local-note"><ShieldCheck/> {analysisNote||'Die Analyse läuft lokal in der App.'}</small></section>
      <section className="mail-results panel"><header><h3><ClipboardCheck/> Vorschläge</h3><span>{items.length}</span></header>{!items.length?<div className="empty"><ScanSearch/><h3>{loading?'Analyse läuft …':'Noch keine Analyse'}</h3><p>{loading?'Das lokale Modell prüft die E‑Mail.':'Nach der Analyse erscheinen hier Termine und Aufgaben zur Prüfung.'}</p></div>:<><div className="suggestions">{items.map(item=><article className={item.selected?'selected':''} key={item.id}><input type="checkbox" checked={item.selected} onChange={e=>setItems(old=>old.map(x=>x.id===item.id?{...x,selected:e.target.checked}:x))}/><span className={`suggestion-icon ${item.kind}`}>{item.kind==='task'?<ClipboardCheck/>:<CalendarPlus/>}</span><div><small>{item.kind==='task'?'AUFGABE':'TERMIN'}</small><input className="suggestion-title" value={item.title} onChange={e=>setItems(old=>old.map(x=>x.id===item.id?{...x,title:e.target.value}:x))}/><p>{item.reason}</p><div className="suggestion-fields"><input aria-label="Datum" type="date" value={item.date??''} onChange={e=>setItems(old=>old.map(x=>x.id===item.id?{...x,date:e.target.value}:x))}/>{item.kind==='appointment'&&<input aria-label="Uhrzeit" type="time" value={item.time??''} onChange={e=>setItems(old=>old.map(x=>x.id===item.id?{...x,time:e.target.value}:x))}/>}</div></div></article>)}</div><button className="primary full" disabled={!items.some(i=>i.selected)} onClick={()=>void accept()}><CheckCircle2/> Auswahl übernehmen</button>{saved>0&&<p className="saved-note"><CheckCircle2/> Übernahme abgeschlossen.</p>}</>}</section>
    </div>
  </>
}

const filterLabels:Record<MailCategory,string>={all:'Alle',task:'Aufgaben',appointment:'Termine',coordination:'Terminabsprachen',change:'Änderungen'}
function MailOverview({mails,days,loading,error,query,filter,processed,customTerms,activeTerm,onDays,onQuery,onFilter,onActiveTerm,onTerms,onSelect,onReload,onClose}:{mails:RecentMail[];days:number;loading:boolean;error:string;query:string;filter:MailCategory;processed:Set<string>;customTerms:string[];activeTerm:string;onDays:(value:number)=>void;onQuery:(value:string)=>void;onFilter:(value:MailCategory)=>void;onActiveTerm:(value:string)=>void;onTerms:(terms:string[])=>void;onSelect:(mail:RecentMail)=>void;onReload:()=>void;onClose:()=>void}){
  const normalized=query.trim().toLowerCase()
  const term=activeTerm.toLowerCase()
  const filtered=mails.filter(mail=>{const text=`${mail.subject} ${mail.sender}`.toLowerCase();return(filter==='all'||mailCategory(mail)===filter)&&(!normalized||text.includes(normalized))&&(!term||text.includes(term))})
  function addTerm(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const input=new FormData(event.currentTarget).get('term')?.toString().trim();if(input&&!customTerms.some(term=>term.toLowerCase()===input.toLowerCase()))onTerms([...customTerms,input]);event.currentTarget.reset()}
  return <div className="mail-overview-overlay" role="dialog" aria-modal="true" aria-label="E-Mail-Übersicht"><section className="mail-overview"><header><div><small>APPLE MAIL</small><h2>E‑Mails vorsortieren</h2></div><button className="icon-btn" onClick={onClose} aria-label="Schließen"><X/></button></header><div className="overview-controls"><label>Zeitraum<select value={days} onChange={event=>onDays(Number(event.target.value))}><option value={1}>Letzter Tag</option><option value={2}>Letzte 2 Tage</option><option value={3}>Letzte 3 Tage</option></select></label><label className="overview-search"><Search/><input value={query} onChange={event=>onQuery(event.target.value)} placeholder="Name, Absender oder E‑Mail-Adresse suchen …"/></label><button className="icon-btn" onClick={onReload} aria-label="Neu laden"><RefreshCw className={loading?'spin':''}/></button></div><div className="mail-filter-tabs">{(Object.keys(filterLabels) as MailCategory[]).map(value=><button key={value} className={filter===value?'active':''} onClick={()=>onFilter(value)}>{filterLabels[value]}</button>)}</div><div className="custom-filter-row"><form onSubmit={addTerm}><input name="term" placeholder="Eigenen Filterbegriff eingeben …"/><button className="primary">Hinzufügen</button></form><div className="custom-filter-chips">{customTerms.map(value=><span key={value} className={activeTerm===value?'active':''}><button onClick={()=>onActiveTerm(activeTerm===value?'':value)}>{value}</button><button aria-label={`${value} entfernen`} onClick={()=>{onTerms(customTerms.filter(term=>term!==value));if(activeTerm===value)onActiveTerm('')}}><X/></button></span>)}</div></div>{error&&<p className="mail-error">{error}</p>}<div className="overview-mail-list">{filtered.map(mail=>{const category=mailCategory(mail),done=processed.has(mail.id);return <button key={mail.id} className={done?'processed':''} onClick={()=>onSelect(mail)}><span className={`mail-kind ${category}`}>{filterLabels[category]}</span><div><strong>{mail.subject}</strong><span>{mail.sender}</span></div><time>{new Date(mail.receivedAt).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</time>{done&&<span className="processed-mark"><CircleCheck/> Bearbeitet</span>}</button>})}{!loading&&!filtered.length&&<div className="empty"><Inbox/><h3>Keine passenden E‑Mails</h3><p>Ändere Zeitraum, Filter oder Suchbegriff.</p></div>}{loading&&<div className="empty"><LoaderCircle className="spin"/><h3>E‑Mails werden geladen …</h3></div>}</div><footer><span>{filtered.length} von {mails.length} E‑Mails</span><button className="ghost" onClick={onClose}>Schließen</button></footer></section></div>
}
