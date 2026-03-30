'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { isAuthenticated } from '@/lib/auth'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon,
  MagnifyingGlassIcon, CurrencyDollarIcon, CpuChipIcon, ServerStackIcon,
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

  const vmName = buildVmName(formData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {server ? 'Edit Server' : 'Add New Server'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Name</label>
                <input type="text" name="project_name" value={formData.project_name} onChange={handleChange} required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Purpose</label>
                <input type="text" name="project_purpose" value={formData.project_purpose} onChange={handleChange} required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Environment</label>
                <select name="environment" value={formData.environment} onChange={handleChange} required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select Environment</option>
                  <option value="Development">Development</option>
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  VM Name <span className="text-xs font-normal text-gray-400">(auto-generated)</span>
                </label>
                <div className="mt-1 block w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-700 font-mono break-all select-all">
                  {vmName || <span className="text-gray-400 italic">Fill in the fields above to generate</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CPU (cores)</label>
                <input type="number" name="cpu" value={formData.cpu} onChange={handleChange} required min="1"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">RAM (GB)</label>
                <input type="number" name="ram" value={formData.ram} onChange={handleChange} required min="1"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Storage (GB)</label>
                <input type="number" name="storage" value={formData.storage} onChange={handleChange} required min="1"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Cost ($)</label>
                <input type="number" name="total_cost" value={formData.total_cost} onChange={handleChange} required min="0" step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">OS Version</label>
                <input type="text" name="os_version" value={formData.os_version} onChange={handleChange} required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">IP Address</label>
                <input type="text" name="ip" value={formData.ip} onChange={handleChange} required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Hostname</label>
                <input type="text" name="hostname" value={formData.hostname} onChange={handleChange} required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input type="text" name="username" value={formData.username} onChange={handleChange} required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Server No</label>
                <input type="text" name="server_no" value={formData.server_no} onChange={handleChange} required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created By</label>
                <input type="text" name="created_by" value={formData.created_by} onChange={handleChange} required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Remarks</label>
              <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
