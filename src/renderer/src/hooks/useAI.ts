import { useCallback, useEffect, useRef, useState } from 'react'
import type { AIProviderId, ModuleId } from '../../../shared/ipc'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatStartOpts {
  module: ModuleId
  promptKey?: string
  ticker?: string
  providerOverride?: AIProviderId
  modelOverride?: string
  messages: AIMessage[]
}

export interface AIState {
  streaming: boolean
  text: string
  error: string | null
  provider: AIProviderId | null
  model: string | null
}

export function useAI(): {
  state: AIState
  start: (opts: ChatStartOpts) => Promise<void>
  cancel: () => void
  reset: () => void
} {
  const [state, setState] = useState<AIState>({
    streaming: false,
    text: '',
    error: null,
    provider: null,
    model: null
  })
  const reqIdRef = useRef<string | null>(null)
  const unsubRef = useRef<Array<() => void>>([])

  const cleanup = useCallback(() => {
    unsubRef.current.forEach((u) => u())
    unsubRef.current = []
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const reset = useCallback((): void => {
    cleanup()
    reqIdRef.current = null
    setState({ streaming: false, text: '', error: null, provider: null, model: null })
  }, [cleanup])

  const cancel = useCallback((): void => {
    if (reqIdRef.current) {
      void window.daja.ai.cancel(reqIdRef.current)
    }
    cleanup()
    setState((s) => ({ ...s, streaming: false }))
  }, [cleanup])

  const start = useCallback(
    async (opts: ChatStartOpts): Promise<void> => {
      cleanup()
      setState({ streaming: true, text: '', error: null, provider: null, model: null })
      try {
        const { requestId, provider, model } = (await window.daja.ai.start(opts)) as {
          requestId: string
          provider: AIProviderId
          model: string
        }
        reqIdRef.current = requestId
        setState((s) => ({ ...s, provider, model }))

        unsubRef.current.push(
          window.daja.ai.onChunk(requestId, (chunk) => {
            setState((s) => ({ ...s, text: s.text + chunk }))
          })
        )
        unsubRef.current.push(
          window.daja.ai.onDone(requestId, () => {
            setState((s) => ({ ...s, streaming: false }))
          })
        )
        unsubRef.current.push(
          window.daja.ai.onError(requestId, (msg) => {
            setState((s) => ({ ...s, streaming: false, error: msg }))
          })
        )
      } catch (err) {
        setState({
          streaming: false,
          text: '',
          error: err instanceof Error ? err.message : 'Start failed',
          provider: null,
          model: null
        })
      }
    },
    [cleanup]
  )

  return { state, start, cancel, reset }
}
