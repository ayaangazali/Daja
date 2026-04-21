import type { LucideIcon } from 'lucide-react'
import { Activity, FileText, HeartPulse, LineChart, MessageSquare, Settings } from 'lucide-react'

export interface ModuleEntry {
  id: string
  name: string
  route: string
  icon: LucideIcon
  enabled: boolean
}

export const MODULES: ModuleEntry[] = [
  { id: 'finance', name: 'Finance', route: '/finance', icon: LineChart, enabled: true },
  { id: 'sports', name: 'Sports', route: '/sports', icon: Activity, enabled: false },
  { id: 'pdf', name: 'PDF Tools', route: '/pdf', icon: FileText, enabled: false },
  { id: 'health', name: 'Health', route: '/health', icon: HeartPulse, enabled: false },
  { id: 'assistant', name: 'Assistant', route: '/assistant', icon: MessageSquare, enabled: false }
]

export const SETTINGS_ENTRY: ModuleEntry = {
  id: 'settings',
  name: 'Settings',
  route: '/settings',
  icon: Settings,
  enabled: true
}

export const AI_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic Claude', defaultModel: 'claude-sonnet-4-6' },
  { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o' },
  { id: 'gemini', name: 'Google Gemini', defaultModel: 'gemini-2.5-pro' },
  { id: 'grok', name: 'xAI Grok', defaultModel: 'grok-4' },
  { id: 'perplexity', name: 'Perplexity', defaultModel: 'sonar-pro' }
] as const

export type AIProviderId = (typeof AI_PROVIDERS)[number]['id']

export const DATA_PROVIDERS = [
  { id: 'fmp', name: 'Financial Modeling Prep' },
  { id: 'alpha_vantage', name: 'Alpha Vantage' },
  { id: 'polygon', name: 'Polygon.io' },
  { id: 'news_api', name: 'NewsAPI' }
] as const

export type DataProviderId = (typeof DATA_PROVIDERS)[number]['id']

export const ALL_PROVIDER_IDS = [
  ...AI_PROVIDERS.map((p) => p.id),
  ...DATA_PROVIDERS.map((p) => p.id)
] as const

export type ProviderId = (typeof ALL_PROVIDER_IDS)[number]
