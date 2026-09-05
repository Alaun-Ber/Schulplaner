import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { db,newId } from '../../db/database'
import type { Priority,TaskStatus } from '../../types'
import { CheckSquare2,CalendarDays,MessagesSquare,RefreshCw } from 'lucide-react'

type Kind='task'|'appointment'|'conversation'|'followup'
const choices=[['task','Aufgabe',CheckSquare2],['appointment','Termin',CalendarDays],['conversation','Gespräch',MessagesSquare],['followup','Wiedervorlage',RefreshCw]] as const

export function QuickCreate({onClose}:{onClose:()=>void}){
  const [kind,setKind]=useState<Kind>('task'),[title,setTitle]=useState(''),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[saving,setSaving]=useState(false)
  const [priority,setPriority]=useState<Priority>('B'),[status,setStatus]=useState<TaskStatus>('new'),[start,setStart]=useState('09:00'),[end,setEnd]=useState('10:00')
  async function save(){
    if(!title.trim())return
    setSaving(true)
    try{
      const id=newId(),now=new Date().toISOString()
      if(kind==='task')await db.tasks.add({id,title:title.trim(),priority,status,dueDate:date||undefined,createdAt:now,updatedAt:now})
      if(kind==='appointment')await db.appointments.add({id,title:title.trim(),start:`${date}T${start}`,end:`${date}T${end}`})
      if(kind==='conversation')await db.conversations.add({id,subject:title.trim(),date,type:'sonstiges',participantIds:[],createdAt:now})
      if(kind==='followup')await db.followUps.add({id,title:title.trim(),followUpDate:date,status:'open'})
      onClose()
    }finally{setSaving(false)}
  }
  return <Modal title="Schnell erstellen" onClose={onClose}>
    <div className="kind-grid">{choices.map(([k,l,I])=><button type="button" className={kind===k?'selected':''} onClick={()=>setKind(k)} key={k}><I/>{l}</button>)}</div>
    <form onSubmit={e=>{e.preventDefault();void save()}}>
      <label>Titel *<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Worum geht es?" required/></label>
      <label>Datum<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      {kind==='task'&&<div className="form-row"><label>Priorität<select value={priority} onChange={e=>setPriority(e.target.value as Priority)}><option value="A">A – dringend</option><option value="B">B – wichtig</option><option value="C">C – normal</option></select></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value as TaskStatus)}><option value="new">Neu</option><option value="in_progress">In Arbeit</option><option value="waiting">Warten</option><option value="delegated">Delegiert</option><option value="done">Erledigt</option></select></label></div>}
      {kind==='appointment'&&<div className="form-row"><label>Von<input required type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Bis<input required type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>}
      <footer><button type="button" className="ghost" onClick={onClose}>Abbrechen</button><button className="primary" disabled={saving}>{saving?'Speichert …':'Speichern'}</button></footer>
    </form>
  </Modal>
}
