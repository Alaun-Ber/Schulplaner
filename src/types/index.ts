export type Priority = 'A' | 'B' | 'C'
export type TaskStatus = 'new' | 'in_progress' | 'waiting' | 'delegated' | 'done' | 'archived'
export interface Task { id:string; title:string; description?:string; category?:string; priority:Priority; priorityOrder?:number; status:TaskStatus; createdAt:string; updatedAt:string; dueDate?:string; followUpDate?:string; assignedPersonId?:string; relatedMeetingId?:string; relatedConversationId?:string; notes?:string }
export interface Appointment { id:string; title:string; start:string; end:string; location?:string; category?:string; participantIds?:string[]; description?:string; notes?:string; externalId?:string; externalSource?:string; readOnly?:boolean }
export interface Protocol { time?:string; location?:string; participants?:string; occasion?:string; course?:string; statements?:string; agreements?:string; tasks?:string; responsible?:string; deadlines?:string; followUpDate?:string; agenda?:string; decisions?:string; schoolYear?:string; childName?:string; className?:string; conversationKind?:string }
export interface Conversation { id:string; date:string; type:string; subject:string; participantIds:string[]; preparation?:string; notes?:string; agreements?:string; followUpDate?:string; createdAt:string; archived?:boolean; protocol?:Protocol }
export interface AgendaItem { id:string; order:number; title:string; description?:string; responsiblePersonId?:string; plannedMinutes?:number; notes?:string; decision?:string; taskId?:string; deadline?:string }
export interface Meeting { id:string; type:string; title:string; date:string; startTime?:string; endTime?:string; location?:string; participantIds?:string[]; chair?:string; recorder?:string; agendaItems:AgendaItem[]; archived?:boolean; protocol?:Protocol }
export interface FollowUp { id:string; title:string; followUpDate:string; category?:string; description?:string; responsiblePersonId?:string; relatedEntityType?:string; relatedEntityId?:string; status:'open'|'processed'|'postponed'|'completed'; notes?:string }
export interface Person { id:string; name:string; role?:string; organisation?:string; email?:string; phone?:string; category?:string; notes?:string }
export interface Documentation { id:string; date:string; subject:string; category:string; participantIds?:string[]; description?:string; measures?:string; nextSteps?:string; archived?:boolean }
export interface DayNote { date:string; text:string }
export interface WeekPlan { week:string; goal:string; notes:Record<string,string> }
export interface TeachingLesson { id:string; date:string; period:number; subject:string; className?:string; material?:string; completed?:boolean; importedAt:string }
export type EntityName = 'tasks'|'appointments'|'conversations'|'meetings'|'followUps'|'people'|'documentation'|'dayNotes'|'weekPlans'|'teachingLessons'
