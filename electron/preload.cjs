const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('schoolPlannerAI',{
  analyseMail:(subject,body)=>ipcRenderer.invoke('local-ai:analyse-mail',{subject,body}),
  status:()=>ipcRenderer.invoke('local-ai:status'),
  recentMail:(days)=>ipcRenderer.invoke('mail:list-recent',days),
  mailContent:(id)=>ipcRenderer.invoke('mail:get-content',id)
})
contextBridge.exposeInMainWorld('schoolPlannerCalDav',{
  status:()=>ipcRenderer.invoke('caldav:status'),
  save:(url,username,password)=>ipcRenderer.invoke('caldav:save',{url,username,password}),
  sync:()=>ipcRenderer.invoke('caldav:sync'),
  disconnect:()=>ipcRenderer.invoke('caldav:disconnect')
})
