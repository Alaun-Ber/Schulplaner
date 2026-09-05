import { db } from '../db/database'
import type { Appointment } from '../types'

type SyncResult={events:Appointment[];url:string;lastSync:string}
export type CalDavStatus={configured:boolean;url?:string;username?:string;lastSync?:string|null}

async function applyResult(result:SyncResult){
  await db.transaction('rw',db.appointments,async()=>{
    const old=await db.appointments.where('externalSource').equals(result.url).primaryKeys()
    await db.appointments.bulkDelete(old)
    if(result.events.length)await db.appointments.bulkPut(result.events)
  })
  return result
}
export const calDavAvailable=()=>Boolean(window.schoolPlannerCalDav)
export const calDavStatus=():Promise<CalDavStatus>=>window.schoolPlannerCalDav?.status()??Promise.resolve({configured:false})
export async function saveCalDav(url:string,username:string,password:string){if(!window.schoolPlannerCalDav)throw new Error('CalDAV ist nur in der Mac-App verfügbar.');return applyResult(await window.schoolPlannerCalDav.save(url,username,password))}
export async function syncCalDav(){if(!window.schoolPlannerCalDav)return null;const status=await window.schoolPlannerCalDav.status();if(!status.configured)return null;return applyResult(await window.schoolPlannerCalDav.sync())}
export async function disconnectCalDav(){const status=await calDavStatus();if(status.url){const ids=await db.appointments.where('externalSource').equals(status.url).primaryKeys();await db.appointments.bulkDelete(ids)}await window.schoolPlannerCalDav?.disconnect()}
