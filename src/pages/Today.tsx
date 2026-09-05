import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useState,useEffect } from 'react'
import { appointmentDay,appointmentStartTime } from '../services/appointments'

export function Today(){
  const day=new Date().toISOString().slice(0,10)
  const data=useLiveQuery(async()=>({tasks:await db.tasks.toArray(),appointments:await db.appointments.toArray(),followups:await db.followUps.toArray(),note:await db.dayNotes.get(day)}),[])
  const [note,setNote]=useState('')
  useEffect(()=>setNote(data?.note?.text??''),[data?.note?.text])
  if(!data)return null
  const open=data.tasks.filter(t=>!['done','archived'].includes(t.status))
  return <><div className="section-heading"><div><p>TAGESPLAN</p><h2>{format(new Date(),'EEEE, d. MMMM',{locale:de})}</h2></div><span className="date-chip">Heute</span></div><div className="today-layout">
    <section className="panel"><h3>Termine</h3>{data.appointments.filter(a=>appointmentDay(a)===day).map(a=><div className="timeline" key={a.id}><time>{appointmentStartTime(a)}</time><div><strong>{a.title||'Termin ohne Titel'}</strong><span>{a.location}</span></div></div>)}</section>
    <section className="panel"><h3>Aufgaben</h3>{[['Überfällig',open.filter(t=>t.dueDate&&t.dueDate<day)],['Heute',open.filter(t=>t.dueDate===day)],['Ohne Termin',open.filter(t=>!t.dueDate)]] .map(([label,items])=><div className="task-group" key={label as string}><h4>{label as string}</h4>{(items as typeof open).map(t=><label className="task-mini" key={t.id}><input type="checkbox" onChange={()=>db.tasks.update(t.id,{status:'done'})}/><span className={`priority p-${t.priority}`}>{t.priority}</span><span>{t.title}</span></label>)}</div>)}</section>
    <aside><section className="panel"><h3>Wiedervorlagen</h3>{data.followups.filter(f=>f.status==='open'&&f.followUpDate<=day).map(f=><div className="follow-mini" key={f.id}><span>{f.followUpDate<day?'Überfällig':'Heute'}</span><strong>{f.title}</strong></div>)}</section><section className="panel"><h3>Tagesnotiz</h3><textarea rows={7} value={note} onChange={e=>setNote(e.target.value)} placeholder="Gedanken, Beobachtungen, offene Punkte …"/><button className="primary full" onClick={()=>db.dayNotes.put({date:day,text:note})}>Notiz speichern</button></section></aside>
  </div></>
}
