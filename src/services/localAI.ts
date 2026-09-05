import { reconcileAISuggestions,type MailSuggestion } from './mailAnalysis'
export async function analyseMailWithLocalAI(subject:string,body:string):Promise<MailSuggestion[]>{
  if(!window.schoolPlannerAI)throw new Error('Lokale KI ist nur in der Mac-App verfügbar.')
  const result=await window.schoolPlannerAI.analyseMail(subject,body)
  const suggestions=result.suggestions.map(item=>({id:crypto.randomUUID(),kind:item.kind,title:item.title,date:item.date||undefined,time:item.time||undefined,endTime:item.endTime||undefined,location:item.location||undefined,reason:item.reason||'Von lokaler KI erkannt',selected:true}))
  return reconcileAISuggestions(subject,body,suggestions)
}
