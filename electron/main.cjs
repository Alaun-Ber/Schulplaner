const { app, BrowserWindow, shell, session, ipcMain, safeStorage } = require('electron')
const path = require('path')
const fs = require('fs')
const { fetchCalendar } = require('./caldav.cjs')
const { spawn } = require('child_process')
const { execFile } = require('child_process')
const { promisify } = require('util')
const execFileAsync = promisify(execFile)

const OLLAMA_URL = 'http://127.0.0.1:11434'
const LOCAL_MODEL = 'qwen3:4b'
let ollamaProcess
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
async function ollamaReady() { try { const response=await fetch(`${OLLAMA_URL}/api/tags`); return response.ok } catch { return false } }
async function ensureOllama() {
  if (await ollamaReady()) return
  const executable = ['/usr/local/bin/ollama','/opt/homebrew/bin/ollama'].find(require('fs').existsSync)
  if (!executable) throw new Error('Ollama ist nicht installiert.')
  ollamaProcess = spawn(executable,['serve'],{stdio:'ignore'})
  for(let attempt=0;attempt<20;attempt++){await delay(300);if(await ollamaReady())return}
  throw new Error('Die lokale KI konnte nicht gestartet werden.')
}
const suggestionSchema={type:'object',properties:{suggestions:{type:'array',items:{type:'object',properties:{kind:{type:'string',enum:['task','appointment']},title:{type:'string'},date:{type:['string','null'],description:'YYYY-MM-DD oder null'},time:{type:['string','null'],description:'HH:mm oder null'},endTime:{type:['string','null']},location:{type:['string','null']},reason:{type:'string'}},required:['kind','title','date','time','endTime','location','reason'],additionalProperties:false}}},required:['suggestions'],additionalProperties:false}
ipcMain.handle('local-ai:analyse-mail',async(_event,{subject,body})=>{
  await ensureOllama()
  const response=await fetch(`${OLLAMA_URL}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:LOCAL_MODEL,stream:false,think:false,format:suggestionSchema,options:{temperature:0},messages:[{role:'system',content:'Du analysierst deutsche E-Mails für eine Schulleitung. Extrahiere nur echte Aufgaben und Termine. Eine erhaltene Einladung ist ein Termin, keine Aufgabe. Eine Aufgabe liegt bei einer konkreten Handlungsaufforderung vor, z. B. erstellen, versenden, prüfen oder antworten. Erfinde keine Daten. Setze date zwingend auf null, wenn in der E-Mail weder ein konkretes Datum noch ein relativer Ausdruck wie heute, morgen oder nächsten Montag steht. Das heutige Datum darf niemals automatisch als Fälligkeit eingesetzt werden. Nur relative Daten beziehen sich auf heute, den '+new Date().toISOString().slice(0,10)+'. Antworte ausschließlich gemäß Schema.'},{role:'user',content:`Betreff: ${subject}\n\nE-Mail:\n${body}`} ]})})
  if(!response.ok){const error=await response.text();throw new Error(error||'Lokale KI antwortet nicht.')}
  const result=await response.json();return JSON.parse(result.message.content)
})
ipcMain.handle('local-ai:status',async()=>{await ensureOllama();const response=await fetch(`${OLLAMA_URL}/api/tags`),data=await response.json();return {ready:data.models?.some(model=>model.name===LOCAL_MODEL||model.model===LOCAL_MODEL)??false,model:LOCAL_MODEL}})
ipcMain.handle('mail:list-recent',async(_event,requestedDays)=>{
  if(process.platform!=='darwin')throw new Error('Der automatische Import ist derzeit für Apple Mail auf dem Mac verfügbar.')
  const days=Math.max(1,Math.min(3,Number(requestedDays)||3))
  const script=`ObjC.import('Foundation');const Mail=Application('Mail');const cutoff=new Date(Date.now()-${days}*24*60*60*1000);const messages=Mail.inbox.messages.whose({dateReceived:{_greaterThan:cutoff}})();const result=[];for(let i=0;i<messages.length&&result.length<150;i++){const message=messages[i];try{const received=message.dateReceived();if(received)result.push({id:String(message.id()),subject:String(message.subject()||'(Ohne Betreff)'),sender:String(message.sender()||''),receivedAt:received.toISOString(),body:''})}catch(e){}};result.sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt));JSON.stringify(result)`
  try{const {stdout}=await execFileAsync('/usr/bin/osascript',['-l','JavaScript','-e',script],{timeout:90000,maxBuffer:2*1024*1024});return JSON.parse(stdout||'[]')}
  catch(error){if(error.killed)throw new Error('Apple Mail hat nicht rechtzeitig geantwortet.');throw new Error('Zugriff auf Apple Mail nicht möglich. Bitte die Berechtigung in Systemeinstellungen > Datenschutz & Sicherheit > Automation erlauben.')}
})
ipcMain.handle('mail:get-content',async(_event,messageId)=>{
  if(process.platform!=='darwin')throw new Error('Apple Mail ist nur auf dem Mac verfügbar.')
  const safeId=JSON.stringify(String(messageId))
  const script=`const Mail=Application('Mail');const wanted=${safeId};const messages=Mail.inbox.messages();let result={body:''};for(let i=0;i<messages.length&&i<500;i++){const message=messages[i];try{if(String(message.id())===wanted){result={body:String(message.content()||'').slice(0,30000)};break}}catch(e){}};JSON.stringify(result)`
  try{const {stdout}=await execFileAsync('/usr/bin/osascript',['-l','JavaScript','-e',script],{timeout:60000,maxBuffer:2*1024*1024});return JSON.parse(stdout||'{"body":""}')}
  catch{throw new Error('Der Inhalt dieser E-Mail konnte nicht aus Apple Mail geladen werden.')}
})

function calDavConfigPath(){return path.join(app.getPath('userData'),'caldav-subscription.json')}
function readCalDavConfig(){try{return JSON.parse(fs.readFileSync(calDavConfigPath(),'utf8'))}catch{return null}}
function publicCalDavStatus(config=readCalDavConfig()){return config?{configured:true,url:config.url,username:config.username,lastSync:config.lastSync??null}:{configured:false}}
function decryptCalDavPassword(config){if(!safeStorage.isEncryptionAvailable())throw new Error('Die sichere Kennwortspeicherung von macOS ist nicht verfügbar.');return safeStorage.decryptString(Buffer.from(config.encryptedPassword,'base64'))}
async function syncCalDav(config=readCalDavConfig()){
  if(!config)throw new Error('Noch kein Kalender-Abo eingerichtet.')
  const events=await fetchCalendar({url:config.url,username:config.username,password:decryptCalDavPassword(config)})
  config.lastSync=new Date().toISOString();fs.writeFileSync(calDavConfigPath(),JSON.stringify(config),{mode:0o600})
  return {events,url:config.url,lastSync:config.lastSync}
}
ipcMain.handle('caldav:status',()=>publicCalDavStatus())
ipcMain.handle('caldav:save',async(_event,input)=>{
  const url=String(input?.url??'').trim(),username=String(input?.username??'').trim(),password=String(input?.password??'')
  if(!url.startsWith('https://'))throw new Error('Bitte eine sichere CalDAV-Adresse mit https:// eingeben.')
  if(!username||!password)throw new Error('Bitte Benutzername und Kennwort eingeben.')
  if(!safeStorage.isEncryptionAvailable())throw new Error('Die sichere Kennwortspeicherung von macOS ist nicht verfügbar.')
  const events=await fetchCalendar({url,username,password})
  const config={url,username,encryptedPassword:safeStorage.encryptString(password).toString('base64'),lastSync:new Date().toISOString()}
  fs.writeFileSync(calDavConfigPath(),JSON.stringify(config),{mode:0o600})
  return {events,url,lastSync:config.lastSync}
})
ipcMain.handle('caldav:sync',()=>syncCalDav())
ipcMain.handle('caldav:disconnect',()=>{try{fs.unlinkSync(calDavConfigPath())}catch{}return {configured:false}})

function createWindow() {
  const window = new BrowserWindow({
    title: 'Schulplaner', width: 1440, height: 920, minWidth: 940, minHeight: 680,
    backgroundColor: '#f5f5f0', show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload:path.join(__dirname,'preload.cjs') }
  })
  window.setMenuBarVisibility(false)
  window.once('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' } })
  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(async () => { await session.defaultSession.clearCache(); createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() }) })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit',()=>{if(ollamaProcess&&!ollamaProcess.killed)ollamaProcess.kill()})
