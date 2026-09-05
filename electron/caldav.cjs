const crypto = require('crypto')

function xmlDecode(value='') {
  return value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&')
}
function icsText(value='') {
  return value.replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\').trim()
}
function property(block,name) {
  const match=block.match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`,'mi'))
  return match?.[1]?.trim()??''
}
function localIso(date) {
  const pad=n=>String(n).padStart(2,'0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
function parseIcsDate(value,allDayEnd=false) {
  if(/^\d{8}$/.test(value)){const y=value.slice(0,4),m=value.slice(4,6),d=value.slice(6,8);return `${y}-${m}-${d}T${allDayEnd?'00:00':'00:00'}`}
  const match=value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/)
  if(!match)return ''
  if(match[7])return localIso(new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]??'00'}Z`))
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`
}
function parseCalendarData(xml,url) {
  const calendars=[...xml.matchAll(/<(?:[A-Za-z][\w.-]*:)?calendar-data\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z][\w.-]*:)?calendar-data>/gi)].map(match=>xmlDecode(match[1]))
  const events=[]
  for(const calendar of calendars){
    const unfolded=calendar.replace(/\r?\n[ \t]/g,'')
    for(const match of unfolded.matchAll(/BEGIN:VEVENT\r?\n([\s\S]*?)\r?\nEND:VEVENT/g)){
      const block=match[1],uid=property(block,'UID')
      const start=parseIcsDate(property(block,'DTSTART')),rawEnd=property(block,'DTEND')
      if(!uid||!start)continue
      let end=parseIcsDate(rawEnd,true)
      if(!end){const fallback=new Date(start);fallback.setHours(fallback.getHours()+1);end=localIso(fallback)}
      events.push({id:`caldav-${crypto.createHash('sha256').update(`${url}\0${uid}`).digest('hex').slice(0,24)}`,externalId:uid,externalSource:url,readOnly:true,title:icsText(property(block,'SUMMARY'))||'Termin',start,end,location:icsText(property(block,'LOCATION')),description:icsText(property(block,'DESCRIPTION')),category:'CalDAV'})
    }
  }
  return events
}
function reportBody() {
  const now=new Date(),from=new Date(now);from.setDate(from.getDate()-30)
  const to=new Date(now);to.setFullYear(to.getFullYear()+1)
  const stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
  return `<?xml version="1.0" encoding="UTF-8"?><C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><D:prop><D:getetag/><C:calendar-data/></D:prop><C:filter><C:comp-filter name="VCALENDAR"><C:comp-filter name="VEVENT"><C:time-range start="${stamp(from)}" end="${stamp(to)}"/></C:comp-filter></C:comp-filter></C:filter></C:calendar-query>`
}
async function fetchCalendar({url,username,password}) {
  const response=await fetch(url,{method:'REPORT',headers:{Authorization:`Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,Depth:'1','Content-Type':'application/xml; charset=utf-8'},body:reportBody(),redirect:'follow'})
  if(response.status===401||response.status===403)throw new Error('Benutzername oder Kennwort ist nicht korrekt.')
  if(!response.ok)throw new Error(`Der Kalender konnte nicht geladen werden (HTTP ${response.status}).`)
  return parseCalendarData(await response.text(),url)
}
module.exports={fetchCalendar,parseCalendarData}
