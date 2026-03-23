'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { Measuremate } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Map,
  BarChart3,
  Settings,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Cpu,
  GitCompareArrows,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNodeStatus, statusConfig } from '@/types/database'

// Context for sharing measuremate state across dashboard pages
interface DashboardContextType {
  user: User
  measuremates: Measuremate[]
  selectedMeasuremate: Measuremate | null
  setSelectedMeasuremate: (m: Measuremate | null) => void
  refreshMeasuremates: () => Promise<void>
}

const DashboardContext = createContext<DashboardContextType | null>(null)

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardShell')
  return ctx
}

interface DashboardShellProps {
  user: User
  initialMeasuremates: Measuremate[]
  children: React.ReactNode
}

export default function DashboardShell({ user, initialMeasuremates, children }: DashboardShellProps) {
  const [measuremates, setMeasuremates] = useState<Measuremate[]>(initialMeasuremates)
  const [selectedMeasuremate, setSelectedMeasuremate] = useState<Measuremate | null>(null)
  const [expandedMeasuremates, setExpandedMeasuremates] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Dark mode toggle
  useEffect(() => {
    const stored = localStorage.getItem('measuremate-dark-mode')
    if (stored === 'true' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev
      localStorage.setItem('measuremate-dark-mode', String(next))
      if (next) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return next
    })
  }

  const refreshMeasuremates = useCallback(async () => {
    const { data } = await supabase
      .from('measuremates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setMeasuremates(data)
  }, [supabase, user.id])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
    router.refresh()
  }

  const handleSelectMeasuremate = (m: Measuremate) => {
    setSelectedMeasuremate(m)
    router.push(`/dashboard/measuremate/${m.id}`)
    setMobileSidebarOpen(false)
  }

  const navItems = [
    { href: '/dashboard', icon: BarChart3, label: 'Overzicht' },
    { href: '/dashboard/map', icon: Map, label: 'Kaart' },
    { href: '/dashboard/compare', icon: GitCompareArrows, label: 'Vergelijken' },
    { href: '/dashboard/settings', icon: Settings, label: 'Instellingen' },
    { href: '/dashboard/api-docs', icon: BookOpen, label: 'API Docs' },
  ]

  // Status summary
  const statusSummary = measuremates.reduce((acc, m) => {
    const status = getNodeStatus(m.last_data_received_at)
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-700">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-lg text-slate-900 dark:text-white">
              Measuremate
            </span>
          )}
        </Link>
      </div>

      {/* Status Summary */}
      {sidebarOpen && measuremates.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>{measuremates.length} nodes</span>
            {statusSummary.online && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {statusSummary.online}
              </span>
            )}
            {statusSummary.warning && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {statusSummary.warning}
              </span>
            )}
            {statusSummary.offline && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {statusSummary.offline}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          )
        })}

        {/* Measuremates section */}
        {sidebarOpen && (
          <div className="pt-4">
            <button
              onClick={() => setExpandedMeasuremates(!expandedMeasuremates)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <span>Measuremates</span>
              {expandedMeasuremates ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {expandedMeasuremates && (
              <div className="space-y-0.5 mt-1">
                {measuremates.map(m => {
                  const status = getNodeStatus(m.last_data_received_at)
                  const config = statusConfig[status]
                  const isActive = selectedMeasuremate?.id === m.id && pathname.startsWith('/dashboard/measuremate/')
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMeasuremate(m)}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', config.dotColor)} />
                      <span className="truncate">{m.name}</span>
                    </button>
                  )
                })}
                <Link
                  href="/dashboard?new=true"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nieuwe Measuremate</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-medium">
            {user.email?.[0]?.toUpperCase() || 'U'}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {user.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <DashboardContext.Provider
      value={{
        user,
        measuremates,
        selectedMeasuremate,
        setSelectedMeasuremate,
        refreshMeasuremates,
      }}
    >
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            'hidden lg:flex flex-col transition-all duration-200',
            sidebarOpen ? 'w-[260px]' : 'w-[72px]'
          )}
        >
          <Sidebar />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-200 lg:hidden',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <Sidebar />
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar */}
          <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setMobileSidebarOpen(!mobileSidebarOpen)
                  } else {
                    setSidebarOpen(!sidebarOpen)
                  }
                }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white hidden sm:block">
                {pathname === '/dashboard' && 'Overzicht'}
                {pathname === '/dashboard/map' && 'Kaartweergave'}
                {pathname === '/dashboard/compare' && 'Vergelijken'}
                {pathname === '/dashboard/settings' && 'Instellingen'}
                {pathname === '/dashboard/api-docs' && 'API Documentatie'}
                {pathname.startsWith('/dashboard/measuremate/') && selectedMeasuremate?.name}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Uitloggen"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  )
}
