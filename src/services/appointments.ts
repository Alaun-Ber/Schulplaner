import type { Appointment } from '../types'

/** Keeps older/incomplete appointment records from breaking a whole view. */
export function appointmentStart(item:Appointment):string {
  const value=typeof item.start==='string'?item.start:''
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)?value:''
}
export function appointmentDay(item:Appointment,fallback=''):string { return appointmentStart(item).slice(0,10)||fallback }
export function appointmentStartTime(item:Appointment,fallback='09:00'):string { return appointmentStart(item).slice(11,16)||fallback }
export function appointmentEndTime(item:Appointment,fallback='10:00'):string {
  const value=typeof item.end==='string'?item.end:''
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)?value.slice(11,16):fallback
}
