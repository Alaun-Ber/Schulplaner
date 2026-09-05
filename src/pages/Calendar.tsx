import { useLiveQuery } from 'dexie-react-hooks'
import { addDays,addMonths,eachDayOfInterval,endOfMonth,endOfWeek,format,isSameDay,startOfMonth,startOfWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { useState } from 'react'
import { db,newId } from '../db/database'
import type { Appointment } from '../types'
import { CalendarDays,ChevronLeft,ChevronRight,Clock3,MapPin,Plus,Trash2 } from 'lucide-react'
import { Modal } from '../components/Modal'
import { appointmentDay,appointmentEndTime,appointmentStart,appointmentStartTime } from '../services/appointments'

type Editor = { date:Date; appointment?:Appointment }

export function CalendarPage(){
  const [date,setDate]=useState(new Date())
  const [view,setView]=useState<'day'|'week'|'month'>('month')
  const [editor,setEditor]=useState<Editor|null>(null)
  const appts=useLiveQuery(()=>db.appointments.toArray(),[])??[]
  const start=view==='month'?startOfWeek(startOfMonth(date),{weekStartsOn:1}):view==='week'?startOfWeek(date,{weekStartsOn:1}):date
  const end=view==='month'?endOfWeek(endOfMonth(date),{weekStartsOn:1}):view==='week'?addDays(start,6):date
  const days=eachDayOfInterval({start,end})
  const dayAppointments=appts.filter(a=>appointmentStart(a)&&isSameDay(new Date(appointmentStart(a)),date)).sort((a,b)=>appointmentStart(a).localeCompare(appointmentStart(b)))
  function move(n:number){setDate(view==='month'?addMonths(date,n):addDays(date,n*(view==='week'?7:1)))}
  return <>
    <div className="section-heading"><div><p>TERMINE</p><h2>Kalender</h2></div><button className="primary" onClick={()=>setEditor({date:new Date()})}><Plus/> Termin</button></div>
    <div className="calendar-controls"><div><button className="icon-btn" onClick={()=>move(-1)}><ChevronLeft/></button><button className="ghost" onClick={()=>setDate(new Date())}>Heute</button><button className="icon-btn" onClick={()=>move(1)}><ChevronRight/></button><strong>{format(date,view==='day'?'EEEE, d. MMMM yyyy':'MMMM yyyy',{locale:de})}</strong></div><div className="calendar-view-tools"><span className="calendar-legend"><i/> Abonnierter Kalender</span><div className="segmented">{(['day','week','month'] as const).map(v=><button className={view===v?'active':''} onClick={()=>setView(v)} key={v}>{v==='day'?'Tag':v==='week'?'Woche':'Monat'}</button>)}</div></div></div>
    {view==='day'?<section className="day-agenda"><header><div className="day-date"><strong>{format(date,'d',{locale:de})}</strong><span><b>{format(date,'EEEE',{locale:de})}</b>{format(date,'MMMM yyyy',{locale:de})}</span></div><button className="primary" onClick={()=>setEditor({date})}><Plus/> Termin an diesem Tag</button></header><div className="day-appointment-list">{dayAppointments.map(a=><button className={a.externalSource?'subscribed-appointment':''} key={a.id} onClick={()=>setEditor({date,appointment:a})}><time><Clock3/>{appointmentStartTime(a)} – {appointmentEndTime(a)}</time><div><strong>{a.title||'Termin ohne Titel'}</strong><span>{a.externalSource?'Abonnierter Kalender':a.category??'Termin'}{a.location&&<><MapPin/>{a.location}</>}</span>{a.description&&<p>{a.description}</p>}</div></button>)}{!dayAppointments.length&&<div className="day-empty"><CalendarDays/><h3>Keine Termine an diesem Tag</h3><p>Der Tag ist noch frei.</p><button className="primary" onClick={()=>setEditor({date})}><Plus/> Termin eintragen</button></div>}</div></section>:<section className={`calendar ${view}`}>
      {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d=><b className="weekday" key={d}>{d}</b>)}
      {days.map(d=><button key={d.toISOString()} className={isSameDay(d,new Date())?'cal-day current':'cal-day'} onClick={()=>setEditor({date:d})}>
        <time>{format(d,'d')}</time>
        {appts.filter(a=>appointmentStart(a)&&isSameDay(new Date(appointmentStart(a)),d)).sort((a,b)=>appointmentStart(a).localeCompare(appointmentStart(b))).map(a=><span className={`event${a.externalSource?' subscribed-event':''}`} key={a.id} onClick={e=>{e.stopPropagation();setEditor({date:d,appointment:a})}} title={a.externalSource?'Abonnierter Termin':'Termin bearbeiten'}>{appointmentStartTime(a)} {a.title||'Termin ohne Titel'}</span>)}
      </button>)}
    </section>}
    {editor&&<AppointmentForm date={editor.date} appointment={editor.appointment} close={()=>setEditor(null)}/>} 
  </>
}

function AppointmentForm({date,appointment,close}:{date:Date;appointment?:Appointment;close:()=>void}){
  const readOnly=Boolean(appointment?.readOnly)
  const [title,setTitle]=useState(appointment?.title??'')
  const [day,setDay]=useState(appointment?appointmentDay(appointment,format(date,'yyyy-MM-dd')):format(date,'yyyy-MM-dd'))
  const [start,setStart]=useState(appointment?appointmentStartTime(appointment):'09:00')
  const [end,setEnd]=useState(appointment?appointmentEndTime(appointment):'10:00')
  const [location,setLocation]=useState(appointment?.location??'')
  const [category,setCategory]=useState(appointment?.category??'Dienstbesprechung')
  const [description,setDescription]=useState(appointment?.description??'')
  async function save(){
    if(readOnly)return
    const values={title:title.trim(),start:`${day}T${start}`,end:`${day}T${end}`,location,category,description}
    if(appointment) await db.appointments.update(appointment.id,values)
    else await db.appointments.add({id:newId(),...values})
    close()
  }
  async function remove(){if(!readOnly&&appointment&&confirm('Termin wirklich löschen?')){await db.appointments.delete(appointment.id);close()}}
  return <Modal title={readOnly?'Abonnierter Termin':appointment?'Termin bearbeiten':'Neuer Termin'} onClose={close}><form onSubmit={e=>{e.preventDefault();void save()}}>
    {readOnly&&<p className="notice">Dieser Termin stammt aus dem CalDAV-Kalender und wird dort verwaltet.</p>}
    <label>Titel *<input required autoFocus={!readOnly} disabled={readOnly} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label>Datum<input required disabled={readOnly} type="date" value={day} onChange={e=>setDay(e.target.value)}/></label>
    <div className="form-row"><label>Von<input required disabled={readOnly} type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Bis<input required disabled={readOnly} type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
    <div className="form-row"><label>Ort<input disabled={readOnly} value={location} onChange={e=>setLocation(e.target.value)}/></label><label>Art<select disabled={readOnly} value={category} onChange={e=>setCategory(e.target.value)}>{['CalDAV','Unterricht','Personalgespräch','Schülergespräch','Elterngespräch','Schulaufsicht','Konferenz','Dienstbesprechung','Prüfung','Fortbildung','Veranstaltung','extern','privat','sonstige'].map(x=><option key={x}>{x}</option>)}</select></label></div>
    <label>Notizen<textarea disabled={readOnly} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label>
    <footer>{appointment&&!readOnly&&<button type="button" className="ghost danger" onClick={()=>void remove()}><Trash2/> Löschen</button>}<span style={{flex:1}}/><button type="button" className="ghost" onClick={close}>{readOnly?'Schließen':'Abbrechen'}</button>{!readOnly&&<button className="primary">Speichern</button>}</footer>
  </form></Modal>
}
