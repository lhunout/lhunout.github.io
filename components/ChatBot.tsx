'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, MessageCircle, RotateCcw, Square, X } from 'lucide-react'
import { chatbotPrompt } from '@/data/cv-data'

/**
 * "Ask about me" chat. The site is a static export with no server, so the
 * browser calls Groq directly with a build-time key that any visitor can read:
 * it must stay on the free plan (30 req/min, 8K tokens/min, 1,000 req/day per model).
 */

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const TOKEN = process.env.NEXT_PUBLIC_GROQ_API_KEY

// `reasoning_effort` values are model-specific: "low" exists only on gpt-oss,
// Qwen3 accepts only "none" or "default".
const MODELS = [
  { id: 'openai/gpt-oss-120b', name: 'gpt-oss 120B', reasoningEffort: 'low' },
  { id: 'qwen/qwen3.8-27b', name: 'Qwen3.8 27B', reasoningEffort: 'none' },
  { id: 'openai/gpt-oss-20b', name: 'gpt-oss 20B', reasoningEffort: 'low' },
] as const

type ModelId = (typeof MODELS)[number]['id']

const SUGGESTIONS = [
  'What does Lilian build at Criteo?',
  'How does his recommender pipeline work?',
  'Where did he study?',
]

type Message = { role: 'user' | 'assistant'; content: string; model?: ModelId }
type Status = 'idle' | 'thinking' | 'streaming'

export const openChat = () => window.dispatchEvent(new Event('chat:open'))

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [model, setModel] = useState<ModelId>(MODELS[0].id)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const busy = status !== 'idle'

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('chat:open', onOpen)
    return () => window.removeEventListener('chat:open', onOpen)
  }, [])

  // On touch screens, focusing would pop the keyboard over the suggestions.
  useEffect(() => {
    if (open && matchMedia('(pointer: fine)').matches) inputRef.current?.focus()
  }, [open])

  const mobileBox = useMobileViewportBox(open)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, status, error])

  const send = useCallback(
    async (text: string, base: Message[]) => {
      const content = text.trim()
      if (!content || abortRef.current) return

      const history: Message[] = [...base, { role: 'user', content }]
      setMessages([...history, { role: 'assistant', content: '', model }])
      setInput('')
      setError(null)
      setStatus('thinking')
      if (inputRef.current) inputRef.current.style.height = ''

      const controller = new AbortController()
      abortRef.current = controller
      let raw = ''

      try {
        if (!TOKEN) throw new Error('missing-token')
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: chatbotPrompt },
              ...history.map(({ role, content }) => ({ role, content })),
            ],
            stream: true,
            max_tokens: 800,
            temperature: 0.6,
            reasoning_effort: MODELS.find((option) => option.id === model)?.reasoningEffort,
          }),
          signal: controller.signal,
        })
        if (!response.ok || !response.body) throw new Error(String(response.status))

        for await (const delta of readDeltas(response.body)) {
          raw += delta
          const visible = stripThinking(raw)
          if (!visible) continue
          setStatus('streaming')
          setMessages([...history, { role: 'assistant', content: visible, model }])
        }
        if (!stripThinking(raw)) throw new Error('empty')
      } catch (err) {
        const visible = stripThinking(raw)
        if (controller.signal.aborted && visible) {
          setMessages([...history, { role: 'assistant', content: visible, model }])
        } else {
          setMessages(history)
          if (!controller.signal.aborted) setError(describeError(err))
        }
      } finally {
        abortRef.current = null
        setStatus('idle')
      }
    },
    [model],
  )

  const stop = () => abortRef.current?.abort()

  const reset = () => {
    stop()
    setMessages([])
    setError(null)
    inputRef.current?.focus()
  }

  const retry = () => {
    const last = messages.at(-1)
    if (last?.role === 'user') void send(last.content, messages.slice(0, -1))
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send(input, messages)
    }
  }

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="fixed right-4 bottom-4 z-[60] flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-ui leading-5 font-medium text-background shadow-lg transition-colors hover:bg-primary sm:right-6 sm:bottom-6"
          >
            <MessageCircle className="size-4" aria-hidden />
            Ask about me
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Ask about Lilian"
            onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={mobileBox}
            className="fixed inset-3 z-[60] flex origin-bottom-right flex-col overflow-hidden rounded-2xl border border-muted bg-background shadow-panel sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[min(640px,calc(100dvh-7.5rem))] sm:w-[400px]"
          >
            <header className="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
              <div
                className="flex rounded-lg bg-muted/60 p-0.5"
                role="radiogroup"
                aria-label="Model"
              >
                {MODELS.map((option) => {
                  const active = option.id === model
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={busy}
                      onClick={() => setModel(option.id)}
                      title={option.id}
                      className={`relative rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="chat-model"
                          className="absolute inset-0 rounded-md bg-background shadow-sm"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                      <span className="relative">{option.name}</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                {messages.length > 0 && (
                  <IconButton label="New chat" onClick={reset}>
                    <RotateCcw className="size-4" />
                  </IconButton>
                )}
                <IconButton label="Close chat" onClick={() => setOpen(false)}>
                  <X className="size-4" />
                </IconButton>
              </div>
            </header>

            <div
              ref={scrollRef}
              data-lenis-prevent
              className="flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 py-5"
            >
              {messages.length === 0 ? (
                <div className="mt-auto">
                  <p className="font-display text-2xl leading-tight">Ask me about Lilian.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Answers come from his CV, written by an open-source model.
                  </p>
                  <div className="mt-5 flex flex-col items-start gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => void send(suggestion, messages)}
                        className="rounded-xl border border-muted px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message, index) =>
                  message.role === 'user' ? (
                    <p
                      key={index}
                      className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-muted px-3.5 py-2 text-sm break-words whitespace-pre-wrap"
                    >
                      {message.content}
                    </p>
                  ) : (
                    <div key={index} className="max-w-full">
                      <span className="data-label !text-label-sm">
                        {MODELS.find((option) => option.id === message.model)?.name}
                      </span>
                      {message.content ? (
                        <div className="mt-1.5 space-y-2 text-ui leading-relaxed break-words">
                          <RichText text={message.content} />
                        </div>
                      ) : (
                        <ThinkingDots />
                      )}
                    </div>
                  ),
                )
              )}

              {error && (
                <p className="text-sm text-muted-foreground">
                  {error}{' '}
                  <button
                    type="button"
                    onClick={retry}
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    Retry
                  </button>
                </p>
              )}
            </div>

            <form
              className="border-t border-muted p-3"
              onSubmit={(event) => {
                event.preventDefault()
                void send(input, messages)
              }}
            >
              <div className="flex items-end gap-2 rounded-xl border border-muted bg-background px-3 py-2 transition-colors focus-within:border-foreground/25">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value)
                    event.target.style.height = 'auto'
                    event.target.style.height = `${event.target.scrollHeight}px`
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Ask anything…"
                  aria-label="Message"
                  className="max-h-32 flex-1 resize-none bg-transparent py-1 text-base leading-6 outline-none placeholder:text-muted-foreground/70 sm:text-ui"
                />
                {busy ? (
                  <button
                    type="button"
                    onClick={stop}
                    aria-label="Stop"
                    className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-background"
                  >
                    <Square className="size-3 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    aria-label="Send"
                    disabled={!input.trim()}
                    className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-background transition-colors hover:bg-primary disabled:opacity-25 disabled:hover:bg-foreground"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                )}
              </div>
              <p className="mt-2 text-center text-caption text-muted-foreground">
                Open-source models on Groq · can make mistakes
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/** Matches the panel's `inset-3`. */
const MOBILE_INSET = 12

function subscribeViewport(onChange: () => void) {
  const vv = window.visualViewport
  vv?.addEventListener('resize', onChange)
  vv?.addEventListener('scroll', onChange)
  return () => {
    vv?.removeEventListener('resize', onChange)
    vv?.removeEventListener('scroll', onChange)
  }
}

const viewportSnapshot = () => {
  const vv = window.visualViewport
  if (!vv || !matchMedia('(max-width: 639px)').matches) return ''
  return `${vv.offsetTop}:${vv.height}`
}

/**
 * Phones only: pins the full-screen panel to the visible viewport, which
 * shrinks when the keyboard opens (iOS doesn't resize the layout for it).
 */
function useMobileViewportBox(active: boolean): CSSProperties | undefined {
  const snapshot = useSyncExternalStore(subscribeViewport, viewportSnapshot, () => '')
  if (!active || !snapshot) return undefined
  const [offsetTop, height] = snapshot.split(':').map(Number)
  return { top: offsetTop + MOBILE_INSET, height: height - 2 * MOBILE_INSET, bottom: 'auto' }
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-lg transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      {children}
    </button>
  )
}

function ThinkingDots() {
  return (
    <span className="mt-2 flex items-center gap-1" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-muted-foreground"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  )
}

/** Minimal markdown: paragraphs, bulleted/numbered lists, **bold**, `code`. */
function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: string[] = []

  const flushList = () => {
    if (!list.length) return
    blocks.push(
      <ul key={blocks.length} className="list-disc space-y-1 pl-5 marker:text-muted-foreground">
        {list.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>,
    )
    list = []
  }

  for (const line of text.split('\n')) {
    const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/)
    if (item) {
      list.push(item[1])
      continue
    }
    flushList()
    if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line)}</p>)
  }
  flushList()

  return <>{blocks}</>
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="rounded bg-muted/70 px-1 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      )
    return part.replace(/^#+\s*/, '')
  })
}

/** Reasoning models may emit their chain of thought inside `<think>…</think>`. */
function stripThinking(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<think>[\s\S]*$/, '')
    .trimStart()
}

async function* readDeltas(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return
      let chunk
      try {
        chunk = JSON.parse(data)
      } catch {
        continue
      }
      if (chunk.error) throw new Error(String(chunk.error.message ?? chunk.error))
      const delta = chunk.choices?.[0]?.delta?.content
      if (delta) yield delta
    }
  }
}

function describeError(err: unknown): string {
  const message = err instanceof Error ? err.message : ''
  if (message === 'missing-token' || message === '401' || message === '403')
    return 'The chat is not available right now.'
  if (message === '402') return 'The chat is out of credits for now.'
  if (message === '429') return 'Too many requests, wait a moment.'
  if (message === 'empty') return 'The model returned nothing.'
  return 'This model is not responding. Try another one, or'
}
