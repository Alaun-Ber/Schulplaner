import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Archive as ArchiveIcon, ArrowDown, ArrowUp, BookOpen, ClipboardList, ClipboardPenLine, Edit3, MessagesSquare, Plus, Printer, RefreshCw, Trash2, Upload, UserRound, UsersRound } from 'lucide-react'
import { db, newId } from '../db/database'
import type { AgendaItem, Conversation, Meeting, Protocol } from '../types'
import { Modal } from '../components/Modal'
import { parsePeopleFile, peopleCsvTemplate } from '../services/peopleImport'
import type { Person } from '../types'
import { printConversationProtocol } from '../services/conversationPrint'

type Kind='conversations'|'meetings'|'followUps'|'people'|'documentation'|'archive'
const entry=(title:string,label:string,icon:typeof MessagesSquare)=>Object.assign([title,label,icon] as const,{icon})
const meta={
  conversations:entry('Gespräche','GESPRÄCHSFÜHRUNG',MessagesSquare), meetings:entry('Konferenzen','SITZUNGEN',UsersRound),
  followUps:entry('Wiedervorlage','NACHVERFOLGUNG',RefreshCw), people:entry('Personen','KONTAKTE',UserRound), documentation:entry('Dokumentation','VORGÄNGE',BookOpen)
} as const

export function EntityPage({kind}:{kind:Kind}) {
  if(kind==='archive') return <ArchivePage/>
  const m=meta[kind], Icon=m.icon
  const rows=useLiveQuery(()=>db.table(kind).toArray(),[kind])??[]
  const [open,setOpen]=useState(false)
  const [edit,setEdit]=useState<Conversation|null>(null)
  const [protocol,setProtocol]=useState<Conversation|Meeting|null>(null)
  const [agenda,setAgenda]=useState<Meeting|null>(null)
  const [peopleImport,setPeopleImport]=useState(false)
  const visible=rows.filter((r:any)=>!r.archived&&(kind!=='followUps'||r.status!=='completed'))
  return <>
    <div className="section-heading"><div><p>{m[1]}</p><h2>{m[0]}</h2></div><div className="heading-actions">{kind==='people'&&<button className="ghost" onClick={()=>setPeopleImport(true)}><Upload/> Importieren</button>}<button className="primary" onClick={()=>setOpen(true)}><Plus/> Neu</button></div></div>
    <section className="entity-grid">
      {visible.map((r:any)=><article className="entity-card" key={r.id}>
        <div className="entity-icon"><Icon/></div><div><span>{r.date??r.followUpDate??r.category??'Allgemein'}</span><h3>{r.subject??r.title??r.name}</h3><p>{r.type??r.role??r.description??r.organisation??'Keine weiteren Angaben'}</p>{r.protocol&&<b className="protocol-badge">Protokoll vorhanden</b>}</div>
        <footer>
          {kind==='conversations'&&<button onClick={()=>setEdit(r)}><Edit3/> Eintrag bearbeiten</button>}
          {kind==='meetings'&&<button onClick={()=>setAgenda(r)}><ClipboardList/> Tagesordnung ({r.agendaItems?.length??0})</button>}
          {(kind==='conversations'||kind==='meetings')&&<button onClick={()=>setProtocol(r)}><ClipboardPenLine/> {r.protocol?'Protokoll bearbeiten':'Protokoll erstellen'}</button>}
          {kind==='followUps'&&<button onClick={()=>db.followUps.update(r.id,{status:'completed'})}>Erledigen</button>}
          {['conversations','meetings','documentation'].includes(kind)&&<button onClick={()=>db.table(kind).update(r.id,{archived:true})}><ArchiveIcon/> Archivieren</button>}
          <button className="danger" onClick={()=>confirm('Eintrag wirklich löschen?')&&db.table(kind).delete(r.id)}><Trash2/></button>
        </footer>
      </article>)}
      {!visible.length&&<div className="empty"><Icon/><h3>Noch keine Einträge</h3><p>Erstellen Sie den ersten Eintrag in diesem Bereich.</p><button className="primary" onClick={()=>setOpen(true)}><Plus/> Erstellen</button></div>}
    </section>
    {open&&<EntityForm kind={kind} close={()=>setOpen(false)}/>} 
    {edit&&<EntityForm kind="conversations" existing={edit} close={()=>setEdit(null)}/>} 
    {agenda&&<AgendaForm meeting={agenda} close={()=>setAgenda(null)}/>} 
    {protocol&&<ProtocolForm entity={protocol} kind={kind as 'conversations'|'meetings'} close={()=>setProtocol(null)}/>} 
    {peopleImport&&<PeopleImport close={()=>setPeopleImport(false)}/>} 
  </>
}

function PeopleImport({close}:{close:()=>void}){
  const [people,setPeople]=useState<Person[]>([]),[error,setError]=useState(''),[filename,setFilename]=useState('')
  async function choose(file?:File){if(!file)return;try{const parsed=await parsePeopleFile(file);if(!parsed.length)throw new Error('empty');setPeople(parsed);setFilename(file.name);setError('')}catch{setPeople([]);setError('Die Datei enthält keine gültigen Personen. Erwartet werden CSV-Spalten oder ein JSON-Array.')}}
  async function save(){await db.people.bulkPut(people);close()}
  function template(){const blob=new Blob([peopleCsvTemplate],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='schulplaner-personen-vorlage.csv';a.click();URL.revokeObjectURL(url)}
  return <Modal title="Personen importieren" onClose={close}><div className="people-import"><p>Importieren Sie eine CSV- oder JSON-Datei. In CSV werden die Spalten <b>name, role, organisation, email, phone, category, notes</b> unterstützt.</p><button className="ghost" onClick={template}>CSV-Vorlage herunterladen</button><label className="file-drop"><Upload/><strong>Datei auswählen</strong><span>CSV oder JSON</span><input type="file" accept=".csv,.json,text/csv,application/json" onChange={e=>choose(e.target.files?.[0])}/></label>{error&&<p className="import-error">{error}</p>}{people.length>0&&<div className="import-preview"><header><strong>{people.length} Personen erkannt</strong><span>{filename}</span></header>{people.slice(0,5).map(p=><div key={p.id}><strong>{p.name}</strong><span>{p.role??p.category??'Keine Rolle'}</span></div>)}{people.length>5&&<small>und {people.length-5} weitere …</small>}</div>}<footer><button className="ghost" onClick={close}>Abbrechen</button><button className="primary" disabled={!people.length} onClick={save}>{people.length} Personen importieren</button></footer></div></Modal>
}

function AgendaForm({meeting,close}:{meeting:Meeting;close:()=>void}) {
  const [items,setItems]=useState<AgendaItem[]>(meeting.agendaItems.map(item=>({...item})))
  const add=()=>setItems(current=>[...current,{id:newId(),order:current.length+1,title:'',description:'',plannedMinutes:10}])
  const update=(id:string,key:keyof AgendaItem,value:string|number)=>setItems(current=>current.map(item=>item.id===id?{...item,[key]:value}:item))
  const remove=(id:string)=>setItems(current=>current.filter(item=>item.id!==id).map((item,index)=>({...item,order:index+1})))
  const move=(index:number,direction:-1|1)=>{const target=index+direction;if(target<0||target>=items.length)return;const copy=[...items];[copy[index],copy[target]]=[copy[target],copy[index]];setItems(copy.map((item,i)=>({...item,order:i+1})))}
  async function save(){const cleaned=items.filter(item=>item.title.trim()).map((item,index)=>({...item,order:index+1,title:item.title.trim()}));await db.meetings.update(meeting.id,{agendaItems:cleaned});close()}
  return <Modal title={`Tagesordnung · ${meeting.title}`} onClose={close}><form className="agenda-form" onSubmit={e=>{e.preventDefault();void save()}}>
    <div className="protocol-info"><strong>Tagesordnung vorbereiten</strong><span>{meeting.date}</span></div>
    <p className="agenda-hint">Die angelegten Punkte erscheinen später automatisch im Konferenzprotokoll.</p>
    <div className="agenda-list">{items.map((item,index)=><article className="agenda-editor" key={item.id}><header><b>TOP {index+1}</b><div><button type="button" className="icon-btn" disabled={index===0} onClick={()=>move(index,-1)} aria-label="Nach oben"><ArrowUp/></button><button type="button" className="icon-btn" disabled={index===items.length-1} onClick={()=>move(index,1)} aria-label="Nach unten"><ArrowDown/></button><button type="button" className="icon-btn danger" onClick={()=>remove(item.id)} aria-label="TOP löschen"><Trash2/></button></div></header><label>Titel *<input required value={item.title} onChange={e=>update(item.id,'title',e.target.value)} placeholder="Bezeichnung des Tagesordnungspunktes"/></label><label>Beschreibung / Vorbereitung<textarea rows={2} value={item.description??''} onChange={e=>update(item.id,'description',e.target.value)}/></label><div className="form-row"><label>Vorgesehene Minuten<input type="number" min="1" value={item.plannedMinutes??10} onChange={e=>update(item.id,'plannedMinutes',Number(e.target.value))}/></label><label>Vorab verantwortlich<input value={item.responsiblePersonId??''} onChange={e=>update(item.id,'responsiblePersonId',e.target.value)} placeholder="Name oder Funktion"/></label></div></article>)}</div>
    <button type="button" className="ghost agenda-add" onClick={add}><Plus/> Tagesordnungspunkt hinzufügen</button>
    <footer><button type="button" className="ghost" onClick={close}>Abbrechen</button><button className="primary">Tagesordnung speichern</button></footer>
  </form></Modal>
}

function ProtocolForm({entity,kind,close}:{entity:Conversation|Meeting;kind:'conversations'|'meetings';close:()=>void}) {
  const old=entity.protocol??{}
  const [value,setValue]=useState<Protocol>({time:old.time??('startTime' in entity?entity.startTime:''),location:old.location??('location' in entity?entity.location:''),participants:old.participants??'',occasion:old.occasion??'',course:old.course??'',statements:old.statements??'',agreements:old.agreements??'',tasks:old.tasks??'',responsible:old.responsible??'',deadlines:old.deadlines??'',followUpDate:old.followUpDate??'',agenda:old.agenda??'',decisions:old.decisions??'',schoolYear:old.schoolYear??'',childName:old.childName??'',className:old.className??'',conversationKind:old.conversationKind??('type' in entity?entity.type:'')})
  const [agendaItems,setAgendaItems]=useState<AgendaItem[]>('agendaItems' in entity?entity.agendaItems.map(item=>({...item})):[])
  const set=(key:keyof Protocol)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setValue({...value,[key]:e.target.value})
  const setAgendaField=(id:string,key:keyof AgendaItem,value:string)=>setAgendaItems(items=>items.map(item=>item.id===id?{...item,[key]:value}:item))
  async function save(){await db.table(kind).update(entity.id,{protocol:value,...(kind==='meetings'?{agendaItems}: {})});close()}
  const title='subject' in entity?entity.subject:entity.title
  return <Modal title={`Protokoll · ${title}`} onClose={close}><form className="protocol-form" onSubmit={e=>{e.preventDefault();void save()}}>
    <div className="protocol-info"><strong>{kind==='conversations'?'Gesprächsprotokoll':'Konferenzprotokoll'}</strong><span>{entity.date}</span></div>
    {kind==='conversations'&&<><div className="form-row"><label>Name/Mitarbeit<input value={value.childName} onChange={set('childName')}/></label><label>Klasse<input value={value.className} onChange={set('className')} placeholder="z. B. 6a"/></label></div><div className="form-row"><label>Schuljahr<input value={value.schoolYear} onChange={set('schoolYear')} placeholder="z. B. 2026/27"/></label><label>Gesprächsart<select value={value.conversationKind} onChange={e=>setValue({...value,conversationKind:e.target.value})}><option value="">Bitte auswählen</option><option>Elterngespräch</option><option>Telefonat</option><option>Schülergespräch</option><option>Mitarbeitergespräch</option><option>Sonstiges Gespräch</option></select></label></div></>}
    <div className="form-row"><label>Uhrzeit<input type="time" value={value.time} onChange={set('time')}/></label><label>Ort<input value={value.location} onChange={set('location')}/></label></div>
    <label>{kind==='conversations'?'Teilnehmer':'Beteiligte / Anwesende'}<textarea rows={2} value={value.participants} onChange={set('participants')} placeholder="Namen und Funktionen"/></label>
    {kind==='meetings'&&<section className="protocol-agenda"><h3>Protokoll nach Tagesordnung</h3>{agendaItems.length===0?<p className="agenda-hint">Noch keine Tagesordnung angelegt. Schließen Sie das Protokoll und wählen Sie zuerst „Tagesordnung“.</p>:agendaItems.map((item,index)=><article className="protocol-top" key={item.id}><header><b>TOP {index+1}</b><strong>{item.title}</strong></header><label>Notiz / Ergebnis<textarea rows={4} value={item.notes??''} onChange={e=>setAgendaField(item.id,'notes',e.target.value)}/></label><div className="form-row"><label>Verantwortlich<input value={item.responsiblePersonId??''} onChange={e=>setAgendaField(item.id,'responsiblePersonId',e.target.value)} placeholder="Name oder Funktion"/></label><label>Erledigen bis<input type="date" value={item.deadline??''} onChange={e=>setAgendaField(item.id,'deadline',e.target.value)}/></label></div><label>Beschluss / Vereinbarung<textarea rows={2} value={item.decision??''} onChange={e=>setAgendaField(item.id,'decision',e.target.value)}/></label></article>)}</section>}
    <label>{kind==='meetings'?'Anlass und Ziel':'Anlass'}<textarea rows={2} value={value.occasion} onChange={set('occasion')}/></label>
    <label>{kind==='meetings'?'Verlauf und Ergebnisse':'Inhalte / Gesprächsverlauf'}<textarea rows={5} value={value.course} onChange={set('course')}/></label>
    <label>Wesentliche Aussagen<textarea rows={3} value={value.statements} onChange={set('statements')}/></label>
    <label>{kind==='conversations'?'Ergebnisse / Vereinbarungen':'Vereinbarungen'}<textarea rows={3} value={value.agreements} onChange={set('agreements')}/></label>
    {kind==='meetings'&&<label>Beschlüsse<textarea rows={3} value={value.decisions} onChange={set('decisions')} placeholder="Beschlusstext und Abstimmungsergebnis"/></label>}
    <div className="form-row"><label>Aufgaben<textarea rows={3} value={value.tasks} onChange={set('tasks')}/></label><label>Verantwortliche<textarea rows={3} value={value.responsible} onChange={set('responsible')}/></label></div>
    <div className="form-row"><label>Fristen<input value={value.deadlines} onChange={set('deadlines')} placeholder="z. B. 30.09.2026"/></label><label>Wiedervorlage<input type="date" value={value.followUpDate} onChange={set('followUpDate')}/></label></div>
    <footer>{kind==='conversations'&&<button type="button" className="ghost" onClick={()=>printConversationProtocol(entity as Conversation,value)}><Printer/> Drucken</button>}<span style={{flex:1}}/><button type="button" className="ghost" onClick={close}>Abbrechen</button><button className="primary">Protokoll speichern</button></footer>
  </form></Modal>
}

function EntityForm({kind,existing,close}:{kind:Exclude<Kind,'archive'>;existing?:Conversation;close:()=>void}) {
  const[title,setTitle]=useState(existing?.subject??''),[date,setDate]=useState(existing?.date??new Date().toISOString().slice(0,10)),[type,setType]=useState(existing?.type??''),[description,setDescription]=useState(existing?.notes??'')
  async function save(){if(existing){await db.conversations.update(existing.id,{subject:title.trim(),date,type:type||'sonstiges',notes:description});close();return}const id=newId(),createdAt=new Date().toISOString();if(kind==='conversations')await db.conversations.add({id,subject:title,date,type:type||'sonstiges',participantIds:[],notes:description,createdAt});if(kind==='meetings')await db.meetings.add({id,title,date,type:type||'Dienstbesprechung',agendaItems:[]});if(kind==='followUps')await db.followUps.add({id,title,followUpDate:date,category:type,description,status:'open'});if(kind==='people')await db.people.add({id,name:title,role:type,notes:description});if(kind==='documentation')await db.documentation.add({id,subject:title,date,category:type||'Schulorganisation',description});close()}
  return <Modal title={existing?'Gesprächseintrag bearbeiten':`${meta[kind][0]} – neuer Eintrag`} onClose={close}><form onSubmit={e=>{e.preventDefault();void save()}}><label>{kind==='people'?'Name':'Betreff / Titel'} *<input autoFocus required value={title} onChange={e=>setTitle(e.target.value)}/></label>{kind!=='people'&&<label>Datum<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>}<label>{kind==='people'?'Rolle':'Art / Kategorie'}<input value={type} onChange={e=>setType(e.target.value)}/></label><label>Notizen<textarea rows={5} value={description} onChange={e=>setDescription(e.target.value)}/></label><footer><button type="button" className="ghost" onClick={close}>Abbrechen</button><button className="primary">{existing?'Änderungen speichern':'Speichern'}</button></footer></form></Modal>
}

function ArchivePage(){const rows=useLiveQuery(async()=>{const[t,c,m,f,d]=await Promise.all([db.tasks.where('status').equals('archived').toArray(),db.conversations.filter(x=>!!x.archived).toArray(),db.meetings.filter(x=>!!x.archived).toArray(),db.followUps.where('status').equals('completed').toArray(),db.documentation.filter(x=>!!x.archived).toArray()]);return[...t.map(x=>({...x,group:'Aufgabe'})),...c.map(x=>({...x,group:'Gespräch'})),...m.map(x=>({...x,group:'Konferenz'})),...f.map(x=>({...x,group:'Wiedervorlage'})),...d.map(x=>({...x,group:'Dokumentation'}))]},[])??[];return <><div className="section-heading"><div><p>ABLAGE</p><h2>Archiv</h2></div></div><section className="entity-grid">{rows.map((r:any)=><article className="entity-card" key={r.id}><div className="entity-icon"><ArchiveIcon/></div><div><span>{r.group}</span><h3>{r.title??r.subject}</h3><p>{r.date??r.followUpDate??r.dueDate}</p></div></article>)}{!rows.length&&<div className="empty"><ArchiveIcon/><h3>Das Archiv ist leer</h3><p>Archivierte und abgeschlossene Einträge erscheinen hier.</p></div>}</section></>}
