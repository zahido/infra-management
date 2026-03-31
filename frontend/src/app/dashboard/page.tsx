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
  ClipboardDocumentIcon, CheckIcon, ExclamationCircleIcon,
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

  // Filtered servers for the main table
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

  // Group by project
  const projectGroups = useMemo(() => {
    const map = new Map<string, Server[]>()
    servers.forEach(s => {
      if (!map.has(s.project_name)) map.set(s.project_name, [])
      map.get(s.project_name)!.push(s)
    })
    return map
  }, [servers])

  // Cost report
  const costReport = useMemo(() => {
    return Array.from(projectGroups.entries()).map(([project, list]) => ({
      project,
      serverCount: list.length,
      totalCost: list.reduce((sum, s) => sum + s.total_cost, 0),
      environments: Array.from(new Set(list.map(s => s.environment))),
    })).sort((a, b) => b.totalCost - a.totalCost)
  }, [projectGroups])

  // CPU & RAM report
  const resourceReport = useMemo(() => {
    return Array.from(projectGroups.entries()).map(([project, list]) => ({
      project,
      serverCount: list.length,
      totalCPU: list.reduce((sum, s) => sum + s.cpu, 0),
      totalRAM: list.reduce((sum, s) => sum + s.ram, 0),
      totalStorage: list.reduce((sum, s) => sum + s.storage, 0),
    })).sort((a, b) => b.totalCPU - a.totalCPU)
  }, [projectGroups])

  // Project server list
  const projectList = useMemo(() => {
    return Array.from(projectGroups.entries()).map(([project, list]) => ({
      project,
      purpose: list[0]?.project_purpose || '',
      servers: list,
    })).sort((a, b) => a.project.localeCompare(b.project))
  }, [projectGroups])

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'servers', label: 'All Servers', icon: <ServerStackIcon className="h-4 w-4" /> },
    { id: 'cost', label: 'Cost Report', icon: <CurrencyDollarIcon className="h-4 w-4" /> },
    { id: 'resources', label: 'CPU & RAM Report', icon: <CpuChipIcon className="h-4 w-4" /> },
    { id: 'project-list', label: 'Project Server List', icon: <ServerStackIcon className="h-4 w-4" /> },
  ]

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="sm:flex sm:items-center mb-6">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Server Management</h1>
            <p className="mt-1 text-sm text-gray-700">
              {servers.length} server{servers.length !== 1 ? 's' : ''} across {projectGroups.size} project{projectGroups.size !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={handleAdd}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Server
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── All Servers ── */}
        {activeTab === 'servers' && (
          <>
            {/* Search Bar */}
            <div className="mb-4 relative max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by project, environment, VM, IP..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Environment</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VM Details</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resources</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                          <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredServers.map(server => (
                          <tr key={server.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{server.project_name}</div>
                              <div className="text-sm text-gray-500">{server.project_purpose}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                server.environment === 'Production'
                                  ? 'bg-red-100 text-red-800'
                                  : server.environment === 'Staging'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {server.environment}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>{server.vm_name}</div>
                              <div className="text-gray-500">{server.os_version}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>CPU: {server.cpu} cores</div>
                              <div>RAM: {server.ram} GB</div>
                              <div>Storage: {server.storage} GB</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>{server.ip}</div>
                              <div className="text-gray-500">{server.hostname}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${server.total_cost.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button onClick={() => handleEdit(server)} className="text-blue-600 hover:text-blue-900 mr-4">
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDelete(server.id)} className="text-red-600 hover:text-red-900">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredServers.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-gray-500">
                          {search ? `No servers match "${search}"` : 'No servers found. Add your first server to get started.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Cost Report ── */}
        {activeTab === 'cost' && (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Environments</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Servers</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cost / Server</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {costReport.map(row => (
                  <tr key={row.project} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.project}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {row.environments.map(env => (
                          <span key={env} className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            env === 'Production' ? 'bg-red-100 text-red-800'
                            : env === 'Staging' ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                          }`}>{env}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{row.serverCount}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">${row.totalCost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-right">
                      ${(row.totalCost / row.serverCount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {costReport.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900" colSpan={2}>Total</td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">{servers.length}</td>
                    <td className="px-6 py-3 text-sm font-bold text-blue-700 text-right">
                      ${servers.reduce((s, r) => s + r.total_cost, 0).toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
            {costReport.length === 0 && (
              <div className="text-center py-12"><p className="text-gray-500">No data available.</p></div>
            )}
          </div>
        )}

        {/* ── CPU & RAM Report ── */}
        {activeTab === 'resources' && (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Servers</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total CPU (cores)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total RAM (GB)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Storage (GB)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg CPU</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg RAM</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resourceReport.map(row => (
                  <tr key={row.project} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.project}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{row.serverCount}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">{row.totalCPU}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">{row.totalRAM}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{row.totalStorage}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-right">
                      {(row.totalCPU / row.serverCount).toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-right">
                      {(row.totalRAM / row.serverCount).toFixed(1)} GB
                    </td>
                  </tr>
                ))}
              </tbody>
              {resourceReport.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900">Total</td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">{servers.length}</td>
                    <td className="px-6 py-3 text-sm font-bold text-blue-700 text-right">
                      {servers.reduce((s, r) => s + r.cpu, 0)}
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-blue-700 text-right">
                      {servers.reduce((s, r) => s + r.ram, 0)}
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-blue-700 text-right">
                      {servers.reduce((s, r) => s + r.storage, 0)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
            {resourceReport.length === 0 && (
              <div className="text-center py-12"><p className="text-gray-500">No data available.</p></div>
            )}
          </div>
        )}

        {/* ── Project Server List ── */}
        {activeTab === 'project-list' && (
          <div className="space-y-6">
            {projectList.map(group => (
              <div key={group.project} className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <div className="bg-blue-50 px-6 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-blue-900">{group.project}</h3>
                    {group.purpose && (
                      <p className="text-xs text-blue-700 mt-0.5">{group.purpose}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold bg-blue-600 text-white px-2.5 py-1 rounded-full">
                    {group.servers.length} server{group.servers.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VM Name</th>
                      <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Environment</th>
                      <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP / Hostname</th>
                      <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OS</th>
                      <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CPU</th>
                      <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">RAM</th>
                      <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Storage</th>
                      <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.servers.map(server => (
                      <tr key={server.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{server.vm_name}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            server.environment === 'Production' ? 'bg-red-100 text-red-800'
                            : server.environment === 'Staging' ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                          }`}>{server.environment}</span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          <div>{server.ip}</div>
                          <div className="text-gray-500 text-xs">{server.hostname}</div>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700">{server.os_version}</td>
                        <td className="px-6 py-3 text-sm text-gray-900 text-right">{server.cpu}c</td>
                        <td className="px-6 py-3 text-sm text-gray-900 text-right">{server.ram} GB</td>
                        <td className="px-6 py-3 text-sm text-gray-900 text-right">{server.storage} GB</td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">${server.total_cost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-6 py-2 text-xs font-bold text-gray-700" colSpan={4}>Project Total</td>
                      <td className="px-6 py-2 text-xs font-bold text-gray-900 text-right">
                        {group.servers.reduce((s, r) => s + r.cpu, 0)}c
                      </td>
                      <td className="px-6 py-2 text-xs font-bold text-gray-900 text-right">
                        {group.servers.reduce((s, r) => s + r.ram, 0)} GB
                      </td>
                      <td className="px-6 py-2 text-xs font-bold text-gray-900 text-right">
                        {group.servers.reduce((s, r) => s + r.storage, 0)} GB
                      </td>
                      <td className="px-6 py-2 text-xs font-bold text-blue-700 text-right">
                        ${group.servers.reduce((s, r) => s + r.total_cost, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}
            {projectList.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">No projects found.</p>
              </div>
            )}
          </div>
        )}

      </div>

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

// Server Modal Component
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
        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900'
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Modal Header */}
        <div className={`px-6 py-5 ${isEditMode ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <ServerStackIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white leading-tight">
                  {isEditMode ? 'Edit Server' : 'Add New Server'}
                </h3>
                <p className="text-xs text-white/70 mt-0.5">
                  {isEditMode
                    ? `Updating configuration for: ${server.vm_name}`
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

            {/* ── Section: Project Information ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-4 w-1 rounded-full bg-blue-600 inline-block" />
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Project Information</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="project_name" value={formData.project_name}
                    onChange={handleChange} onBlur={() => handleBlur('project_name')}
                    placeholder="e.g. My Web App"
                    className={inputClass('project_name')} />
                  {fieldError('project_name') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('project_name')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Project Purpose <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="project_purpose" value={formData.project_purpose}
                    onChange={handleChange} onBlur={() => handleBlur('project_purpose')}
                    placeholder="e.g. Backend API"
                    className={inputClass('project_purpose')} />
                  {fieldError('project_purpose') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('project_purpose')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Environment <span className="text-red-500">*</span>
                  </label>
                  <select name="environment" value={formData.environment}
                    onChange={handleChange} onBlur={() => handleBlur('environment')}
                    className={inputClass('environment')}>
                    <option value="">Select Environment</option>
                    <option value="Development">Development</option>
                    <option value="Staging">Staging</option>
                    <option value="Production">Production</option>
                  </select>
                  {fieldError('environment') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('environment')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    VM Name <span className="text-xs font-normal text-gray-400">(auto-generated)</span>
                  </label>
                  <div className="mt-1 w-full border border-dashed border-gray-300 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-600 font-mono break-all select-all min-h-[42px]">
                    {vmName || <span className="text-gray-400 italic text-xs">Fill in fields above to generate</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* ── Section: Server Resources ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-4 w-1 rounded-full bg-indigo-500 inline-block" />
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Server Resources</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    CPU (cores) <span className="text-red-500">*</span>
                  </label>
                  <input type="number" name="cpu" value={formData.cpu}
                    onChange={handleChange} onBlur={() => handleBlur('cpu')} min="1"
                    className={inputClass('cpu')} />
                  {fieldError('cpu') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('cpu')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    RAM (GB) <span className="text-red-500">*</span>
                  </label>
                  <input type="number" name="ram" value={formData.ram}
                    onChange={handleChange} onBlur={() => handleBlur('ram')} min="1"
                    className={inputClass('ram')} />
                  {fieldError('ram') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('ram')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Storage (GB) <span className="text-red-500">*</span>
                  </label>
                  <input type="number" name="storage" value={formData.storage}
                    onChange={handleChange} onBlur={() => handleBlur('storage')} min="1"
                    className={inputClass('storage')} />
                  {fieldError('storage') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('storage')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Total Cost ($) <span className="text-red-500">*</span>
                  </label>
                  <input type="number" name="total_cost" value={formData.total_cost}
                    onChange={handleChange} onBlur={() => handleBlur('total_cost')} min="0" step="0.01"
                    className={inputClass('total_cost')} />
                  {fieldError('total_cost') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('total_cost')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    OS Version <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="os_version" value={formData.os_version}
                    onChange={handleChange} onBlur={() => handleBlur('os_version')}
                    placeholder="e.g. Ubuntu 22.04"
                    className={inputClass('os_version')} />
                  {fieldError('os_version') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('os_version')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* ── Section: Network & Access ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-emerald-500 inline-block" />
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Network & Access</h4>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    copied
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  {copied
                    ? <><CheckIcon className="h-3.5 w-3.5" /> Copied!</>
                    : <><ClipboardDocumentIcon className="h-3.5 w-3.5" /> Copy Credentials</>}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    IP Address <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="ip" value={formData.ip}
                    onChange={handleChange} onBlur={() => handleBlur('ip')}
                    placeholder="e.g. 192.168.1.100"
                    className={inputClass('ip')} />
                  {fieldError('ip') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('ip')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Hostname <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="hostname" value={formData.hostname}
                    onChange={handleChange} onBlur={() => handleBlur('hostname')}
                    placeholder="e.g. server01.example.com"
                    className={inputClass('hostname')} />
                  {fieldError('hostname') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('hostname')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="username" value={formData.username}
                    onChange={handleChange} onBlur={() => handleBlur('username')}
                    placeholder="e.g. admin" autoComplete="off"
                    className={inputClass('username')} />
                  {fieldError('username') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('username')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </label>
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
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldError('password') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('password')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* ── Section: Additional Info ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-4 w-1 rounded-full bg-purple-500 inline-block" />
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Additional Info</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Server No <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="server_no" value={formData.server_no}
                    onChange={handleChange} onBlur={() => handleBlur('server_no')}
                    placeholder="e.g. SRV-001"
                    className={inputClass('server_no')} />
                  {fieldError('server_no') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('server_no')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Created By <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="created_by" value={formData.created_by}
                    onChange={handleChange} onBlur={() => handleBlur('created_by')}
                    placeholder="e.g. John Doe"
                    className={inputClass('created_by')} />
                  {fieldError('created_by') && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />{fieldError('created_by')}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Remarks</label>
                  <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={3}
                    placeholder="Optional notes about this server..."
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-none" />
                </div>
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Fields marked <span className="text-red-500 font-medium">*</span> are required
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-5 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-2 ${
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
                    Saving...
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
