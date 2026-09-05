import React from 'react'; import ReactDOM from 'react-dom/client'; import { HashRouter } from 'react-router-dom'; import { registerSW } from 'virtual:pwa-register'
import { App } from './app/App'; import './styles.css'; import './protocol.css'; import './dashboard.css'; import './teaching-planner.css'; import './settings.css'; import './topbar.css'; import { db,seedDemoData } from './db/database'
import './mail-assistant.css'
import './mail-toast.css'
import './recent-mail.css'
import './mail-overview.css'
import './custom-mail-filter.css'
import './calendar-day.css'
import { syncEmbeddedTeachingPlanner } from './services/teachingImport'
import { scheduleSyncWrite } from './services/fileSync'
import { syncCalDav } from './services/caldav'
if(location.protocol!=='file:')registerSW({ immediate:true }); seedDemoData().catch(()=>undefined); syncEmbeddedTeachingPlanner().catch(()=>undefined)
syncCalDav().catch(()=>undefined);window.setInterval(()=>syncCalDav().catch(()=>undefined),30*60*1000)
window.addEventListener('storage',event=>{if(event.key==='schulplaner_v1'){syncEmbeddedTeachingPlanner().catch(()=>undefined);scheduleSyncWrite()}})
for(const table of db.tables){for(const event of ['creating','updating','deleting'] as const)(table.hook as any)(event,()=>scheduleSyncWrite())}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><HashRouter><App/></HashRouter></React.StrictMode>)
