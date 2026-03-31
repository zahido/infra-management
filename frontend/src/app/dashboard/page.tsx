'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { isAuthenticated } from '@/lib/auth'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon,
  MagnifyingGlassIcon, CurrencyDollarIcon, CpuChipIcon, ServerStackIcon, XMarkIcon,
  ClipboardDocumentIcon, CheckIcon, ExclamationCircleIcon, FolderOpenIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline'

interface Server {
  id: string
  project_name: string
  project_purpose: string
  environment: string
  vm_name: string
  cpu: number
  ram: number
  storage: number
  total_cost: number
  os_version: string
  ip: string
  hostname: string
  username: string
  password: string
  server_no: string
  created_by: string
  remarks: string
  delete_date?: string
  created_at: string
  updated_at: string
}

type Tab = 'servers' | 'cost' | 'resources' | 'project-list'

const ENV_STYLES: Record<string, string> = {
  Production: 'bg-red-100 text-red-700 ring-1 ring-red-200',
  Staging: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  Development: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
}
const envStyle = (env: string) => ENV_STYLES[env] ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'

export default function Dashboard() {
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingServer, setEditingServer] = useState<Server | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('servers')
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    fetchServers()
  }, [router])

  const fetchServers = async () => {
    try {
      const response = await api.get('/api/servers')
      setServers(response.data.servers || [])
    } catch (error) {
      toast.error('Failed to fetch servers')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this server?')) return
    try {
      await api.delete(`/api/servers/${id}`)
      toast.success('Server deleted successfully')
      fetchServers()
    } catch (error) {
      toast.error('Failed to delete server')
    }
  }

  const handleEdit = (server: Server) => {
    setEditingServer(server)
    setShowModal(true)
  }

  const handleAdd = () => {
    setEditingServer(null)
    setShowModal(true)
  }

  const filteredServers = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return servers
    return servers.filter(s =>
      s.project_name.toLowerCase().includes(q) ||
      s.project_purpose.toLowerCase().includes(q) ||
      s.environment.toLowerCase().includes(q) ||
      s.vm_name.toLowerCase().includes(q) ||
      s.ip.toLowerCase().includes(q) ||
      s.hostname.toLowerCase().includes(q)
    )
  }, [servers, search])

  const projectGroups = useMemo(() => {
    const map = new Map<string, Server[]>()
    servers.forEach(s => {
      if (!map.has(s.project_name)) map.set(s.project_name, [])
      map.get(s.project_name)!.push(s)
    })
    return map
  }, [servers])

  const costReport = useMemo(() => {
    return Array.from(projectGroups.entries()).map(([project, list]) => ({
      project,
      serverCount: list.length,
      totalCost: list.reduce((sum, s) => sum + s.total_cost, 0),
      environments: Array.from(new Set(list.map(s => s.environment))),
    })).sort((a, b) => b.totalCost - a.totalCost)
  }, [projectGroups])

  const resourceReport = useMemo(() => {
    return Array.from(projectGroups.entries()).map(([project, list]) => ({
      project,
      serverCount: list.length,
      totalCPU: list.reduce((sum, s) => sum + s.cpu, 0),
      totalRAM: list.reduce((sum, s) => sum + s.ram, 0),
      totalStorage: list.reduce((sum, s) => sum + s.storage, 0),
    })).sort((a, b) => b.totalCPU - a.totalCPU)
  }, [projectGroups])

  const projectList = useMemo(() => {
    return Array.from(projectGroups.entries()).map(([project, list]) => ({
      project,
      purpose: list[0]?.project_purpose || '',
      servers: list,
    })).sort((a, b) => a.project.localeCompare(b.project))
  }, [projectGroups])

  const totalCost = useMemo(() => servers.reduce((s, r) => s + r.total_cost, 0), [servers])

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'servers', label: 'All Servers', icon: <ServerStackIcon className="h-4 w-4" /> },
    { id: 'cost', label: 'Cost Report', icon: <CurrencyDollarIcon className="h-4 w-4" /> },
    { id: 'resources', label: 'CPU & RAM', icon: <CpuChipIcon className="h-4 w-4" /> },
    { id: 'project-list', label: 'By Project', icon: <FolderOpenIcon className="h-4 w-4" /> },
  ]

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm text-slate-500">Loading infrastructure data…</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* ── Page Header ── */}
      <div className="mb-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Infrastructure Overview</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage and monitor all servers across your projects.
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Server
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <KpiCard
            label="Total Servers"
            value={servers.length.toString()}
            sub={`across ${projectGroups.size} project${projectGroups.size !== 1 ? 's' : ''}`}
            icon={<ServerStackIcon className="h-5 w-5 text-blue-600" />}
            color="blue"
          />
          <KpiCard
            label="Total Cost"
            value={`$${totalCost.toFixed(2)}`}
            sub={servers.length ? `avg $${(totalCost / servers.length).toFixed(2)}/server` : 'no data'}
            icon={<CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />}
            color="emerald"
          />
          <KpiCard
            label="Total CPU"
            value={`${servers.reduce((s, r) => s + r.cpu, 0)} cores`}
            sub={servers.length ? `avg ${(servers.reduce((s, r) => s + r.cpu, 0) / servers.length).toFixed(1)} cores/server` : 'no data'}
            icon={<CpuChipIcon className="h-5 w-5 text-violet-600" />}
            color="violet"
          />
          <KpiCard
            label="Total RAM"
            value={`${servers.reduce((s, r) => s + r.ram, 0)} GB`}
            sub={`${servers.reduce((s, r) => s + r.storage, 0)} GB storage total`}
            icon={<CircleStackIcon className="h-5 w-5 text-amber-600" />}
            color="amber"
          />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── All Servers ── */}
      {activeTab === 'servers' && (
        <>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search servers, projects, IPs…"
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Environment</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">VM / OS</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Resources</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Network</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost</th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredServers.map((server, idx) => (
                    <tr key={server.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 text-xs text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">{server.project_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{server.project_purpose}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${envStyle(server.environment)}`}>
                          {server.environment}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-900">{server.vm_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{server.os_version}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-slate-800">{server.cpu}</span> CPU
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-slate-800">{server.ram}</span> GB RAM
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-slate-800">{server.storage}</span> GB
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-900 font-mono">{server.ip}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{server.hostname}</p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-slate-900">${server.total_cost.toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(server)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(server.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredServers.length === 0 && (
                <EmptyState message={search ? `No servers match "${search}"` : 'No servers yet. Add your first server to get started.'} />
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Cost Report ── */}
      {activeTab === 'cost' && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Cost by Project</h2>
            <span className="text-xs text-slate-500">{costReport.length} project{costReport.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Environments</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Servers</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cost</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg / Server</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {costReport.map(row => (
                  <tr key={row.project} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{row.project}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {row.environments.map(env => (
                          <span key={env} className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${envStyle(env)}`}>{env}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700 text-right">{row.serverCount}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-900 text-right">${row.totalCost.toFixed(2)}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 text-right">${(row.totalCost / row.serverCount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              {costReport.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-5 py-3.5 text-sm font-bold text-slate-900" colSpan={2}>Grand Total</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-slate-900 text-right">{servers.length}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-blue-700 text-right">
                      ${servers.reduce((s, r) => s + r.total_cost, 0).toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
            {costReport.length === 0 && <EmptyState message="No cost data available." />}
          </div>
        </div>
      )}

      {/* ── CPU & RAM Report ── */}
      {activeTab === 'resources' && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Resource Utilization by Project</h2>
            <span className="text-xs text-slate-500">{resourceReport.length} project{resourceReport.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Servers</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total CPU</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total RAM</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Storage</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg CPU</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg RAM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resourceReport.map(row => (
                  <tr key={row.project} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{row.project}</td>
                    <td className="px-5 py-4 text-sm text-slate-700 text-right">{row.serverCount}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900 text-right">{row.totalCPU} cores</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900 text-right">{row.totalRAM} GB</td>
                    <td className="px-5 py-4 text-sm text-slate-700 text-right">{row.totalStorage} GB</td>
                    <td className="px-5 py-4 text-sm text-slate-600 text-right">{(row.totalCPU / row.serverCount).toFixed(1)}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 text-right">{(row.totalRAM / row.serverCount).toFixed(1)} GB</td>
                  </tr>
                ))}
              </tbody>
              {resourceReport.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-5 py-3.5 text-sm font-bold text-slate-900">Total</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-slate-900 text-right">{servers.length}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-blue-700 text-right">{servers.reduce((s, r) => s + r.cpu, 0)} cores</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-blue-700 text-right">{servers.reduce((s, r) => s + r.ram, 0)} GB</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-blue-700 text-right">{servers.reduce((s, r) => s + r.storage, 0)} GB</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
            {resourceReport.length === 0 && <EmptyState message="No resource data available." />}
          </div>
        </div>
      )}

      {/* ── Project Server List ── */}
      {activeTab === 'project-list' && (
        <div className="space-y-5">
          {projectList.map(group => (
            <div key={group.project} className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{group.project}</h3>
                  {group.purpose && (
                    <p className="text-xs text-slate-400 mt-0.5">{group.purpose}</p>
                  )}
                </div>
                <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full shadow">
                  {group.servers.length} server{group.servers.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">VM Name</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Environment</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">IP / Hostname</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">OS</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">CPU</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">RAM</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.servers.map(server => (
                      <tr key={server.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-slate-900">{server.vm_name}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${envStyle(server.environment)}`}>
                            {server.environment}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm text-slate-900 font-mono">{server.ip}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{server.hostname}</p>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600">{server.os_version}</td>
                        <td className="px-5 py-3 text-sm text-slate-900 text-right">{server.cpu}c</td>
                        <td className="px-5 py-3 text-sm text-slate-900 text-right">{server.ram} GB</td>
                        <td className="px-5 py-3 text-sm text-slate-900 text-right">{server.storage} GB</td>
                        <td className="px-5 py-3 text-sm font-semibold text-slate-900 text-right">${server.total_cost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td className="px-5 py-2.5 text-xs font-bold text-slate-600" colSpan={4}>Project Total</td>
                      <td className="px-5 py-2.5 text-xs font-bold text-slate-900 text-right">{group.servers.reduce((s, r) => s + r.cpu, 0)}c</td>
                      <td className="px-5 py-2.5 text-xs font-bold text-slate-900 text-right">{group.servers.reduce((s, r) => s + r.ram, 0)} GB</td>
                      <td className="px-5 py-2.5 text-xs font-bold text-slate-900 text-right">{group.servers.reduce((s, r) => s + r.storage, 0)} GB</td>
                      <td className="px-5 py-2.5 text-xs font-bold text-blue-700 text-right">
                        ${group.servers.reduce((s, r) => s + r.total_cost, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
          {projectList.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200">
              <EmptyState message="No projects found." />
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ServerModal
          server={editingServer}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false)
            fetchServers()
          }}
        />
      )}
    </Layout>
  )
}

// ── KPI Card ──
function KpiCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string
  icon: React.ReactNode; color: 'blue' | 'emerald' | 'violet' | 'amber'
}) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50', emerald: 'bg-emerald-50', violet: 'bg-violet-50', amber: 'bg-amber-50',
  }
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-slate-200 shadow-sm flex items-start gap-4">
      <div className={`flex items-center justify-center h-10 w-10 rounded-xl shrink-0 ${bg[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5 truncate">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  )
}

// ── Empty State ──
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <ServerStackIcon className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm text-slate-500 max-w-xs">{message}</p>
    </div>
  )
}

// ── Server Modal ──
interface ServerModalProps {
  server: Server | null
  onClose: () => void
  onSave: () => void
}

function buildVmName(d: {
  project_name: string; project_purpose: string; environment: string
  cpu: number; ram: number; storage: number; ip: string
}): string {
  const slug = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-\.]/g, '')
  const parts = [
    slug(d.project_name),
    slug(d.project_purpose),
    slug(d.environment),
    `${d.cpu}c`,
    `${d.ram}gb`,
    `${d.storage}gb`,
    d.ip.trim() || 'no-ip',
  ]
  return parts.filter(Boolean).join('-')
}

function ServerModal({ server, onClose, onSave }: ServerModalProps) {
  const initialData = {
    project_name: server?.project_name || '',
    project_purpose: server?.project_purpose || '',
    environment: server?.environment || '',
    cpu: server?.cpu || 1,
    ram: server?.ram || 1,
    storage: server?.storage || 10,
    total_cost: server?.total_cost || 0,
    os_version: server?.os_version || '',
    ip: server?.ip || '',
    hostname: server?.hostname || '',
    username: server?.username || '',
    password: server?.password || '',
    server_no: server?.server_no || '',
    created_by: server?.created_by || '',
    remarks: server?.remarks || '',
  }
  const [formData, setFormData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const validate = (data: typeof formData) => {
    const errors: Record<string, string> = {}
    if (!data.project_name.trim()) errors.project_name = 'Project name is required'
    if (!data.project_purpose.trim()) errors.project_purpose = 'Project purpose is required'
    if (!data.environment) errors.environment = 'Please select an environment'
    if (data.cpu < 1) errors.cpu = 'Must be at least 1 core'
    if (data.ram < 1) errors.ram = 'Must be at least 1 GB'
    if (data.storage < 1) errors.storage = 'Must be at least 1 GB'
    if (data.total_cost < 0) errors.total_cost = 'Cost cannot be negative'
    if (!data.os_version.trim()) errors.os_version = 'OS version is required'
    if (!data.ip.trim()) errors.ip = 'IP address is required'
    else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(data.ip.trim())) errors.ip = 'Enter a valid IP (e.g. 192.168.1.1)'
    if (!data.hostname.trim()) errors.hostname = 'Hostname is required'
    if (!data.username.trim()) errors.username = 'Username is required'
    if (!data.password.trim()) errors.password = 'Password is required'
    if (!data.server_no.trim()) errors.server_no = 'Server number is required'
    if (!data.created_by.trim()) errors.created_by = 'Created by is required'
    return errors
  }

  const errors = validate(formData)
  const fieldError = (name: string) =>
    (touched[name] || submitAttempted) && errors[name] ? errors[name] : null

  const inputClass = (name: string) =>
    `mt-1 block w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 transition-colors ${
      fieldError(name)
        ? 'border-red-400 focus:ring-red-300 bg-red-50 text-red-900 placeholder-red-300'
        : 'border-slate-200 focus:ring-blue-500 focus:border-blue-400 bg-white text-slate-900'
    }`

  const handleBlur = (name: string) =>
    setTouched(prev => ({ ...prev, [name]: true }))

  const handleCopyCredentials = () => {
    const text = `IP Address: ${formData.ip}\nHostname: ${formData.hostname}\nUsername: ${formData.username}\nPassword: ${formData.password}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const vmName = buildVmName(formData)
  const isEditMode = !!server

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)
    if (Object.keys(validate(formData)).length > 0) return
    setLoading(true)
    try {
      const payload = { ...formData, vm_name: vmName }
      if (server) {
        await api.put(`/api/servers/${server.id}`, payload)
        toast.success('Server updated successfully')
      } else {
        await api.post('/api/servers', payload)
        toast.success('Server created successfully')
      }
      onSave()
    } catch (error) {
      toast.error('Failed to save server')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cpu' || name === 'ram' || name === 'storage' || name === 'total_cost'
        ? Number(value)
        : value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Modal Header */}
        <div className={`px-6 py-5 ${isEditMode ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <ServerStackIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  {isEditMode ? 'Edit Server' : 'Add New Server'}
                </h3>
                <p className="text-xs text-white/70 mt-0.5">
                  {isEditMode
                    ? `Updating: ${server.vm_name}`
                    : 'Fill in the details to register a new server'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-6 space-y-7 max-h-[68vh] overflow-y-auto">

            {/* Project Information */}
            <div>
              <SectionHeader color="blue" label="Project Information" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Project Name" required error={fieldError('project_name')}>
                  <input type="text" name="project_name" value={formData.project_name}
                    onChange={handleChange} onBlur={() => handleBlur('project_name')}
                    placeholder="e.g. My Web App" className={inputClass('project_name')} />
                </Field>
                <Field label="Project Purpose" required error={fieldError('project_purpose')}>
                  <input type="text" name="project_purpose" value={formData.project_purpose}
                    onChange={handleChange} onBlur={() => handleBlur('project_purpose')}
                    placeholder="e.g. Backend API" className={inputClass('project_purpose')} />
                </Field>
                <Field label="Environment" required error={fieldError('environment')}>
                  <select name="environment" value={formData.environment}
                    onChange={handleChange} onBlur={() => handleBlur('environment')}
                    className={inputClass('environment')}>
                    <option value="">Select Environment</option>
                    <option value="Development">Development</option>
                    <option value="Staging">Staging</option>
                    <option value="Production">Production</option>
                  </select>
                </Field>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    VM Name <span className="text-xs font-normal text-slate-400">(auto-generated)</span>
                  </label>
                  <div className="mt-1 w-full border border-dashed border-slate-300 bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-600 font-mono break-all select-all min-h-[42px]">
                    {vmName || <span className="text-slate-400 italic text-xs">Fill in fields above to generate</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Server Resources */}
            <div>
              <SectionHeader color="indigo" label="Server Resources" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="CPU (cores)" required error={fieldError('cpu')}>
                  <input type="number" name="cpu" value={formData.cpu}
                    onChange={handleChange} onBlur={() => handleBlur('cpu')} min="1"
                    className={inputClass('cpu')} />
                </Field>
                <Field label="RAM (GB)" required error={fieldError('ram')}>
                  <input type="number" name="ram" value={formData.ram}
                    onChange={handleChange} onBlur={() => handleBlur('ram')} min="1"
                    className={inputClass('ram')} />
                </Field>
                <Field label="Storage (GB)" required error={fieldError('storage')}>
                  <input type="number" name="storage" value={formData.storage}
                    onChange={handleChange} onBlur={() => handleBlur('storage')} min="1"
                    className={inputClass('storage')} />
                </Field>
                <Field label="Total Cost ($)" required error={fieldError('total_cost')}>
                  <input type="number" name="total_cost" value={formData.total_cost}
                    onChange={handleChange} onBlur={() => handleBlur('total_cost')} min="0" step="0.01"
                    className={inputClass('total_cost')} />
                </Field>
                <Field label="OS Version" required error={fieldError('os_version')}>
                  <input type="text" name="os_version" value={formData.os_version}
                    onChange={handleChange} onBlur={() => handleBlur('os_version')}
                    placeholder="e.g. Ubuntu 22.04" className={inputClass('os_version')} />
                </Field>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Network & Access */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionHeader color="emerald" label="Network & Access" noMargin />
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    copied
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {copied
                    ? <><CheckIcon className="h-3.5 w-3.5" /> Copied!</>
                    : <><ClipboardDocumentIcon className="h-3.5 w-3.5" /> Copy Credentials</>}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="IP Address" required error={fieldError('ip')}>
                  <input type="text" name="ip" value={formData.ip}
                    onChange={handleChange} onBlur={() => handleBlur('ip')}
                    placeholder="e.g. 192.168.1.100" className={inputClass('ip')} />
                </Field>
                <Field label="Hostname" required error={fieldError('hostname')}>
                  <input type="text" name="hostname" value={formData.hostname}
                    onChange={handleChange} onBlur={() => handleBlur('hostname')}
                    placeholder="e.g. server01.example.com" className={inputClass('hostname')} />
                </Field>
                <Field label="Username" required error={fieldError('username')}>
                  <input type="text" name="username" value={formData.username}
                    onChange={handleChange} onBlur={() => handleBlur('username')}
                    placeholder="e.g. admin" autoComplete="off" className={inputClass('username')} />
                </Field>
                <Field label="Password" required error={fieldError('password')}>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={() => handleBlur('password')}
                      autoComplete="new-password"
                      placeholder="Enter password"
                      className={`block w-full rounded-lg px-3 py-2.5 text-sm border pr-10 focus:outline-none focus:ring-2 transition-colors ${
                        fieldError('password')
                          ? 'border-red-400 focus:ring-red-300 bg-red-50'
                          : 'border-slate-200 focus:ring-blue-500 focus:border-blue-400 bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldError('password') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('password')}
                    </p>
                  )}
                </Field>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Additional Info */}
            <div>
              <SectionHeader color="purple" label="Additional Info" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Server No" required error={fieldError('server_no')}>
                  <input type="text" name="server_no" value={formData.server_no}
                    onChange={handleChange} onBlur={() => handleBlur('server_no')}
                    placeholder="e.g. SRV-001" className={inputClass('server_no')} />
                </Field>
                <Field label="Created By" required error={fieldError('created_by')}>
                  <input type="text" name="created_by" value={formData.created_by}
                    onChange={handleChange} onBlur={() => handleBlur('created_by')}
                    placeholder="e.g. John Doe" className={inputClass('created_by')} />
                </Field>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Remarks</label>
                  <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={3}
                    placeholder="Optional notes about this server..."
                    className="mt-1 block w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white resize-none" />
                </div>
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Fields marked <span className="text-red-500 font-medium">*</span> are required
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-2 ${
                  isEditMode
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving…
                  </>
                ) : isEditMode ? 'Update Server' : 'Add Server'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  )
}

// ── Small helpers ──
function SectionHeader({ color, label, noMargin }: { color: string; label: string; noMargin?: boolean }) {
  const dot: Record<string, string> = {
    blue: 'bg-blue-600', indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', purple: 'bg-purple-500',
  }
  return (
    <div className={`flex items-center gap-2 ${noMargin ? '' : 'mb-4'}`}>
      <span className={`h-4 w-1 rounded-full inline-block ${dot[color] ?? 'bg-slate-400'}`} />
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</h4>
    </div>
  )
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error: string | null; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{error}
        </p>
      )}
    </div>
  )
}
