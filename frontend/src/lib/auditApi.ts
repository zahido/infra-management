import api from './api'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  user_id: string
  username: string
  action: string
  resource: string
  resource_id: string
  details: Record<string, unknown>
  ip_address: string
  user_agent: string
  status: 'success' | 'failure'
  timestamp: string
}

export interface AuditLogsResponse {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface AuditStatsResponse {
  total: number
  by_action: { key: string; count: number }[]
  by_status: { key: string; count: number }[]
  top_users: { key: string; count: number }[]
  daily_activity: { date: string; count: number }[]
}

export interface AuditLogsParams {
  page?: number
  limit?: number
  user_id?: string
  username?: string
  action?: string
  resource?: string
  status?: 'success' | 'failure'
  date_from?: string
  date_to?: string
}

// Action constants — mirror the backend consts
export const AuditAction = {
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  REGISTER: 'REGISTER',
  SERVER_CREATE: 'SERVER_CREATE',
  SERVER_UPDATE: 'SERVER_UPDATE',
  SERVER_DELETE: 'SERVER_DELETE',
} as const

export const AuditResource = {
  AUTH: 'AUTH',
  SERVER: 'SERVER',
} as const

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * Fetch a paginated, filterable list of audit log entries.
 * Requires a valid JWT (handled automatically by the api interceptor).
 */
export async function getAuditLogs(params: AuditLogsParams = {}): Promise<AuditLogsResponse> {
  const query = new URLSearchParams()
  if (params.page)      query.set('page',      String(params.page))
  if (params.limit)     query.set('limit',     String(params.limit))
  if (params.user_id)   query.set('user_id',   params.user_id)
  if (params.username)  query.set('username',  params.username)
  if (params.action)    query.set('action',    params.action)
  if (params.resource)  query.set('resource',  params.resource)
  if (params.status)    query.set('status',    params.status)
  if (params.date_from) query.set('date_from', params.date_from)
  if (params.date_to)   query.set('date_to',   params.date_to)

  const response = await api.get<AuditLogsResponse>(`/api/audit/logs?${query.toString()}`)
  return response.data
}

/**
 * Fetch aggregate audit statistics (action counts, active users, daily activity).
 * Requires a valid JWT (handled automatically by the api interceptor).
 */
export async function getAuditStats(params: { date_from?: string; date_to?: string } = {}): Promise<AuditStatsResponse> {
  const query = new URLSearchParams()
  if (params.date_from) query.set('date_from', params.date_from)
  if (params.date_to)   query.set('date_to',   params.date_to)

  const response = await api.get<AuditStatsResponse>(`/api/audit/stats?${query.toString()}`)
  return response.data
}
