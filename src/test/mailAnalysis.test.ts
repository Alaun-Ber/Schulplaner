import { describe,expect,it } from 'vitest'
import { analyseMail,reconcileAISuggestions } from '../services/mailAnalysis'

describe('E-Mail-Analyse',()=>{
  it('erkennt ausgeschriebene deutsche Termindaten nach einer Ordnungszahl',()=>{
    const suggestions=analyseMail('Einladung zur Steuergruppensitzung','Die Sitzung findet am 3. September 2026 um 14:30 Uhr statt.')
    expect(suggestions).toEqual(expect.arrayContaining([expect.objectContaining({kind:'appointment',date:'2026-09-03',time:'14:30'})]))
  })
  it('behandelt einen Einladungs-Betreff nicht selbst als Aufgabe',()=>{
    const suggestions=analyseMail('Einladung zur Steuergruppensitzung und Rückmeldung','Die Sitzung findet am 3. September 2026 um 14:30 Uhr statt.')
    expect(suggestions.filter(item=>item.kind==='task')).toHaveLength(0)
    expect(suggestions.filter(item=>item.kind==='appointment')).toHaveLength(1)
  })
  it('erkennt das Erstellen oder Versenden einer Einladung als Aufgabe',()=>{
    const suggestions=analyseMail('Vorbereitung','Bitte erstelle und versende eine Einladung an das Kollegium bis zum 31.08.2026.')
    expect(suggestions).toEqual(expect.arrayContaining([expect.objectContaining({kind:'task',date:'2026-08-31'})]))
  })
  it('entfernt erfundene Aufgaben und Daten aus automatischen Terminaktualisierungen',()=>{
    const subject='Aktualisierte Termineinladung: Kennenlernen Hr. Linnemann'
    const body='Janin Schmidt hat einen Termin aktualisiert:\nWann:\nFreitag, 04. September 2026 12:00 - 12:30\n*Diese E-Mail wurde automatisch generiert*'
    const ai=[{id:'1',kind:'task' as const,title:'Erstellen Sie eine neue Termin-Einladung',date:'2026-08-25',reason:'KI',selected:true}]
    const result=reconcileAISuggestions(subject,body,ai)
    expect(result.filter(item=>item.kind==='task')).toHaveLength(0)
    expect(result).toEqual(expect.arrayContaining([expect.objectContaining({kind:'appointment',date:'2026-09-04',time:'12:00'})]))
  })
  it('behandelt eine Aufforderung mit Frist als eine vollständige Aufgabe und nicht als Termin',()=>{
    const subject='Einladung zur Steuergruppensitzung und Rückmeldung'
    const body='Die Sitzung findet am 3. September 2026 um 14:30 Uhr statt. Bitte prüfen Sie die angehängte Tagesordnung und senden Sie mir Ihre Rückmeldung bis zum 31.08.2026.'
    const result=reconcileAISuggestions(subject,body,[{id:'1',kind:'task',title:'prüfen',reason:'KI',selected:true},{id:'2',kind:'task',title:'senden',reason:'KI',selected:true}])
    expect(result.filter(item=>item.kind==='task')).toHaveLength(1)
    expect(result.find(item=>item.kind==='task')).toEqual(expect.objectContaining({date:'2026-08-31',title:expect.stringContaining('Tagesordnung und senden Sie mir Ihre Rückmeldung')}))
    expect(result.filter(item=>item.kind==='appointment')).toEqual([expect.objectContaining({date:'2026-09-03',time:'14:30'})])
  })
})
