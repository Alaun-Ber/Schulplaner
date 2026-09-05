import { db,newId } from '../db/database'
import type { TeachingLesson } from '../types'

type PlannerState={stoff?:Array<{id?:string;datum?:string;stunde?:number;fach?:string;klasseId?:string;material?:string;erledigt?:boolean}>;klassen?:Array<{id:string;name:string}>;data?:unknown;state?:unknown}
async function storePlannerState(parsed:PlannerState){
  const state=((parsed.state??parsed.data??parsed) as PlannerState)
  if(!Array.isArray(state.stoff))throw new Error('invalid-planner')
  const classNames=new Map((state.klassen??[]).map(k=>[k.id,k.name])),importedAt=new Date().toISOString()
  const lessons:TeachingLesson[]=state.stoff.filter(row=>row.datum&&row.fach&&typeof row.stunde==='number').map(row=>({id:row.id||newId(),date:row.datum!,period:row.stunde!,subject:row.fach!,className:row.klasseId?classNames.get(row.klasseId):undefined,material:row.material||undefined,completed:!!row.erledigt,importedAt}))
  await db.transaction('rw',db.teachingLessons,async()=>{await db.teachingLessons.clear();await db.teachingLessons.bulkPut(lessons)})
  return lessons.length
}
export async function importTeachingPlanner(file:File){return storePlannerState(JSON.parse(await file.text()) as PlannerState)}
export async function syncEmbeddedTeachingPlanner(){const raw=localStorage.getItem('schulplaner_v1');if(!raw)return 0;return storePlannerState(JSON.parse(raw) as PlannerState)}
