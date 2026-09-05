import { describe,expect,it } from 'vitest'
import type { Appointment } from '../types'
import { appointmentDay,appointmentEndTime,appointmentStartTime } from '../services/appointments'

describe('Termin-Kompatibilität',()=>{
  it('verwendet bei unvollständigen Altterminen sichere Standardzeiten',()=>{
    const old={id:'alt',title:'Alttermin',start:'2026-08-25T14:30'} as Appointment
    expect(appointmentDay(old)).toBe('2026-08-25')
    expect(appointmentStartTime(old)).toBe('14:30')
    expect(appointmentEndTime(old)).toBe('10:00')
  })
  it('blendet beschädigte Datumswerte sicher aus',()=>{
    const broken={id:'kaputt',title:'Alttermin'} as Appointment
    expect(appointmentDay(broken)).toBe('')
    expect(appointmentStartTime(broken)).toBe('09:00')
  })
})
