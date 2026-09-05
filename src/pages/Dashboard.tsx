import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowRight,AlertTriangle,BookOpenCheck,CalendarDays,CheckSquare2,MapPin,RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '../db/database'
import { appointmentDay,appointmentStart,appointmentStartTime } from '../services/appointments'

const today=()=>new Date().toISOString().slice(0,10)
export function Dashboard(){
  const data=useLiveQuery(async()=>{const[tasks,appointments,followups,teachingLessons]=await Promise.all([db.tasks.toArray(),db.appointments.toArray(),db.followUps.toArray(),db.teachingLessons.toArray()]);return{tasks,appointments,followups,teachingLessons}},[])
  if(!data)return <div className="loading">Übersicht wird geladen …</div>
  const open=data.tasks.filter(t=>!['done','archived'].includes(t.status))
  const appts=data.appointments.filter(a=>appointmentDay(a)===today()).sort((a,b)=>appointmentStart(a).localeCompare(appointmentStart(b)))
  const due=open.filter(t=>t.dueDate===today()),overdue=open.filter(t=>t.dueDate&&t.dueDate<today()),follows=data.followups.filter(f=>f.status==='open'),lessons=data.teachingLessons.filter(l=>l.date===today()).sort((a,b)=>a.period-b.period)
  const greeting=new Date().getHours()<12?'Guten Morgen':new Date().getHours()<18?'Guten Tag':'Guten Abend'
  return <>
    <section className="welcome"><div><p>{greeting}</p><h2>{format(new Date(),'EEEE, d. MMMM yyyy',{locale:de})}</h2></div><span>Alles Wichtige für Ihren Schultag auf einen Blick.</span></section>
    <div className="metrics"><Metric icon={CalendarDays} label="Termine heute" value={appts.length}/><Metric icon={CheckSquare2} label="Offene Aufgaben" value={open.length}/><Metric icon={AlertTriangle} label="Überfällig" value={overdue.length} alert/><Metric icon={RefreshCw} label="Wiedervorlagen" value={follows.length}/></div>
    <section className="teaching-today"><header><div><span><BookOpenCheck/></span><div><p>UNTERRICHTSPLANUNG</p><h3>Unterricht heute</h3></div></div><Link to="/einstellungen">Unterrichtsdaten aktualisieren <ArrowRight/></Link></header>{lessons.length?<div className="lesson-row">{lessons.map(lesson=><article key={lesson.id} className={lesson.completed?'completed':''}><b>{lesson.period}. Std.</b><strong>{lesson.subject}</strong><span>{lesson.className??'Keine Klasse'}</span>{lesson.material&&<p>{lesson.material}</p>}</article>)}</div>:<div className="teaching-empty"><p>Für heute wurden keine Unterrichtsstunden importiert.</p><Link to="/einstellungen">Unterrichtsplanung einbinden</Link></div>}</section>
    <div className="dashboard-grid">
      <Panel title="Heute" link="/heute">{appts.length?appts.map(a=><div className="timeline" key={a.id}><time>{appointmentStartTime(a)}</time><div><strong>{a.title||'Termin ohne Titel'}</strong><span>{a.location&&<><MapPin/> {a.location}</>}</span></div></div>):<Empty text="Keine Termine heute"/>}</Panel>
      <Panel title="Aufgaben" link="/aufgaben">{[...overdue,...due].slice(0,5).map(t=><label className="task-mini" key={t.id}><input type="checkbox" onChange={()=>db.tasks.update(t.id,{status:'done',updatedAt:new Date().toISOString()})}/><span className={`priority p-${t.priority}`}>{t.priority}{t.priorityOrder}</span><span>{t.title}<small>{t.dueDate&&t.dueDate<today()?'Überfällig':'Heute fällig'}</small></span></label>)}{!overdue.length&&!due.length&&<Empty text="Heute ist alles erledigt"/>}</Panel>
      <Panel title="Wiedervorlagen" link="/wiedervorlage">{follows.sort((a,b)=>a.followUpDate.localeCompare(b.followUpDate)).slice(0,5).map(f=><div className="follow-mini" key={f.id}><span className={f.followUpDate<today()?'overdue':''}>{f.followUpDate<today()?'Überfällig':f.followUpDate===today()?'Heute':format(new Date(f.followUpDate),'dd. MMM',{locale:de})}</span><strong>{f.title}</strong></div>)}{!follows.length&&<Empty text="Keine offenen Wiedervorlagen"/>}</Panel>
    </div>
  </>
}
function Metric({icon:Icon,label,value,alert=false}:{icon:typeof CalendarDays;label:string;value:number;alert?:boolean}){return <article className={alert&&value?'metric alert':'metric'}><span><Icon/></span><div><strong>{value}</strong><small>{label}</small></div></article>}
function Panel({title,link,children}:{title:string;link:string;children:React.ReactNode}){return <section className="panel"><header><h3>{title}</h3><Link to={link}>Alle <ArrowRight/></Link></header><div>{children}</div></section>}
function Empty({text}:{text:string}){return <div className="empty-small">{text}</div>}
