import { newId } from '../db/database'
import type { Person } from '../types'

const fields=['name','role','organisation','email','phone','category','notes'] as const
function csvRows(text:string){const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'&&quoted&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=!quoted;else if(c===','&&!quoted){row.push(cell.trim());cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell=''}else cell+=c}row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows}
export async function parsePeopleFile(file:File):Promise<Person[]>{
  const text=await file.text();let raw:Record<string,unknown>[]
  if(file.name.toLowerCase().endsWith('.json')){const parsed=JSON.parse(text);raw=Array.isArray(parsed)?parsed:parsed.people;if(!Array.isArray(raw))throw new Error('invalid')}
  else {const rows=csvRows(text);if(rows.length<2)throw new Error('empty');const headers=rows[0].map(h=>h.toLowerCase().trim());raw=rows.slice(1).map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]??''])))}
  return raw.map(item=>{const person:Person={id:typeof item.id==='string'&&item.id?item.id:newId(),name:String(item.name??item.Name??'').trim()};for(const field of fields.slice(1)){const value=item[field];if(value!=null&&String(value).trim())person[field]=String(value).trim()}return person}).filter(p=>p.name)
}
export const peopleCsvTemplate='name,role,organisation,email,phone,category,notes\nErika Beispiel,Lehrkraft,Musterschule,erika@example.de,01234 56789,Lehrkraft,Beispieldatensatz\n'
