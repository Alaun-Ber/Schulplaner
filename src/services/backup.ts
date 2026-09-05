import { db } from '../db/database'
import type { EntityName } from '../types'
import { syncEmbeddedTeachingPlanner } from './teachingImport'
const tables: EntityName[] = ['tasks','appointments','conversations','meetings','followUps','people','documentation','dayNotes','weekPlans','teachingLessons']
export async function createBackup() { const data:Record<string,unknown[]> = {}; for (const name of tables) data[name] = await db.table(name).toArray(); return { version:1, exportedAt:new Date().toISOString(), data, localData:{teachingPlanner:localStorage.getItem('schulplaner_v1'),teacher:localStorage.getItem('schulplaner_lehrer'),logo:localStorage.getItem('schulplaner_logo')} } }
export async function restoreBackup(raw:unknown, replace=true) {
  if (!raw || typeof raw !== 'object' || !('version' in raw) || !('data' in raw)) throw new Error('invalid-backup')
  const backup=raw as {version:number;data:Record<string,unknown[]>;localData?:{teachingPlanner?:string|null;teacher?:string|null;logo?:string|null}}; if(backup.version!==1 || typeof backup.data!=='object') throw new Error('invalid-version')
  await db.transaction('rw', db.tables, async()=>{ for(const name of tables){ const rows=backup.data[name]; if(!Array.isArray(rows)) continue; const table=db.table(name); if(replace) await table.clear(); await table.bulkPut(rows) } })
  if(backup.localData?.teachingPlanner){localStorage.setItem('schulplaner_v1',backup.localData.teachingPlanner);await syncEmbeddedTeachingPlanner()}
  if(backup.localData?.teacher)localStorage.setItem('schulplaner_lehrer',backup.localData.teacher)
  if(backup.localData?.logo)localStorage.setItem('schulplaner_logo',backup.localData.logo)
}
export async function downloadBackup() {
  const backup=await createBackup(), content=JSON.stringify(backup,null,2), filename=`schulplaner-backup-${new Date().toISOString().slice(0,10)}.json`
  const picker=(window as typeof window & {showSaveFilePicker?:(options:unknown)=>Promise<{createWritable:()=>Promise<{write:(data:string)=>Promise<void>;close:()=>Promise<void>}>}>}).showSaveFilePicker
  if(picker){const handle=await picker({suggestedName:filename,types:[{description:'Schulplaner-Backup',accept:{'application/json':['.json']}}]});const writable=await handle.createWritable();await writable.write(content);await writable.close();return 'chosen' as const}
  const blob=new Blob([content],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);return 'download' as const
}
