import type { Utils } from 'sequelize'

export type SessionReportShape = {
  id: number
  eventId: number
  data: unknown
  files: unknown[]
  supportingAttachments: unknown[]
  goalTemplates: {
    id: number
    standard: string
  }[]
  trainers: {
    id: number
    name: string
    fullName: string
  }[]
  updatedAt: string
  event: unknown
  approverId: number | null
  submitterId: number | null
  approver: {
    id: number
    fullName: string
  } | null
  submitted: boolean
  submitter: {
    id: number
    fullName: string
  } | null
}

export type SessionReportTableRow = {
  id: number
  eventId: string | null
  eventName: string | null
  sessionName: string | null
  startDate: string | null
  endDate: string | null
  objectiveTopics: string[] | null
  goalTemplates: { standard: string }[]
  recipients: { label: string }[]
  participants: string[]
  duration: number
}

export type GetSessionReportsResponse = {
  count: number
  rows: SessionReportTableRow[]
}

export type GetSessionReportsParams = {
  sortBy?: string
  sortDir?: string
  offset?: number
  limit?: number | 'all'
  format?: 'json' | 'csv'
}

type SessionReportSortSortMapEntryKey = 'id' | 'sessionName' | 'startDate' | 'endDate' | 'eventId' | 'eventName' | 'supportingGoals' | 'topics'

export type SessionReportTableRowSortMapEntry = readonly [string, Utils.Literal | string] | [string]

// eslint-disable-next-line max-len
export type SessionReportSortSortMap = Record<SessionReportSortSortMapEntryKey, SessionReportTableRowSortMapEntry>
