import Dexie, { type EntityTable } from 'dexie'
import type { Appointment, Conversation, DayNote, Documentation, FollowUp, Meeting, Person, Task, TeachingLesson, WeekPlan } from '../types'

export class SchoolPlannerDB extends Dexie {
  tasks!: EntityTable<Task,'id'>; appointments!: EntityTable<Appointment,'id'>; conversations!: EntityTable<Conversation,'id'>
  meetings!: EntityTable<Meeting,'id'>; followUps!: EntityTable<FollowUp,'id'>; people!: EntityTable<Person,'id'>
  documentation!: EntityTable<Documentation,'id'>; dayNotes!: EntityTable<DayNote,'date'>; weekPlans!: EntityTable<WeekPlan,'week'>
  teachingLessons!: EntityTable<TeachingLesson,'id'>
  constructor() { super('schoolPlannerDB'); this.version(1).stores({
    tasks:'id,status,priority,dueDate,followUpDate,createdAt', appointments:'id,start,end,category', conversations:'id,date,type,archived',
    meetings:'id,date,type,archived', followUps:'id,followUpDate,status', people:'id,name,category', documentation:'id,date,category,archived', dayNotes:'date', weekPlans:'week'
  })
    this.version(2).stores({teachingLessons:'id,date,period,subject'})
    this.version(3).stores({appointments:'id,start,end,category,externalSource'})
  }
}
export const db = new SchoolPlannerDB()
export const newId = () => crypto.randomUUID()

export async function seedDemoData() {
  if (await db.tasks.count()) return
  const now = new Date(), iso = now.toISOString(), today = iso.slice(0,10)
  const friday = new Date(now); friday.setDate(now.getDate() + ((5-now.getDay()+7)%7 || 7))
  await db.transaction('rw', db.tables, async () => {
    await db.tasks.bulkAdd([
      {id:newId(),title:'Teilzeitantrag prüfen',priority:'A',status:'new',dueDate:today,category:'Personal',createdAt:iso,updatedAt:iso},
      {id:newId(),title:'Gesamtkonferenz vorbereiten',priority:'A',priorityOrder:2,status:'in_progress',dueDate:friday.toISOString().slice(0,10),category:'Konferenz',createdAt:iso,updatedAt:iso},
      {id:newId(),title:'Medienkonzept abstimmen',priority:'B',status:'waiting',category:'IT',createdAt:iso,updatedAt:iso}
    ])
    await db.appointments.add({id:newId(),title:'Personalgespräch',start:`${today}T09:00`,end:`${today}T10:00`,location:'Schulleitungsbüro',category:'Personalgespräch'})
    await db.followUps.add({id:newId(),title:'Rückmeldung Personalstelle prüfen',followUpDate:today,category:'Personal',status:'open'})
    await db.meetings.add({id:newId(),type:'Gesamtkonferenz',title:'Gesamtkonferenz',date:friday.toISOString().slice(0,10),startTime:'14:00',location:'Aula',agendaItems:[]})
  })
}
