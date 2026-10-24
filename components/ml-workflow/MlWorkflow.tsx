'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { SectionHeading } from '@/components/Timeline'
import { BASELINE, probe, type Config } from '@/lib/ann'
import { workflow } from '@/data/cv-data'
import { TrackLabel, Caption, Module, Counter } from './primitives'
import { CostPanel } from './CostPanel'
import { AnnSearchModule } from './AnnSearchModule'
import { AbTestModule } from './AbTestModule'
import { DeployBand } from './DeployBand'

/**
 * Full lifecycle of a retrieval recommender, on two tracks:
 *   OFFLINE  user actions → data preparation → training → evaluation → deploy
 *   ONLINE   sequence → inference → ANN search → A/B test
 * plus an interactive cost panel whose recall and latency are computed from
 * `lib/ann.ts`.
 */

const ALL_STEPS = [...workflow.offline, ...workflow.online]

/** "Everything shown" step, held before the loop restarts. */
const HOLD = ALL_STEPS.length + 2

const SEQUENCE = ['t−4', 't−3', 't−2', 't−1', 't'] as const

type EventType = 'view' | 'cart' | 'click' | 'noise'

const TOKEN_CLASS: Record<EventType, string> = {
  view: 'bg-muted-foreground/45',
  click: 'bg-primary/60',
  cart: 'bg-primary',
  noise: 'border border-muted-foreground/50 bg-transparent',
}

const TOKEN_TEXT: Record<Exclude<EventType, 'noise'>, string> = {
  view: 'text-muted-foreground',
  click: 'text-primary/70',
  cart: 'text-primary',
}

/** Log lines: width = relative event volume. */
const LOG_LINES: { width: number; event: EventType }[] = [
  { width: 0.95, event: 'view' },
  { width: 0.7, event: 'click' },
  { width: 0.85, event: 'view' },
  { width: 0.55, event: 'cart' },
  { width: 0.75, event: 'view' },
]

/** Raw interleaved stream, including noise (bots, duplicates) that gets filtered out. */
const RAW_EVENTS: EventType[] = [
  'view',
  'noise',
  'click',
  'view',
  'view',
  'cart',
  'noise',
  'view',
  'click',
  'view',
  'noise',
  'cart',
]

/** Cleaned, ordered sessions, padded to SESSION_LENGTH (dashed cells). */
const SESSION_LENGTH = 6
const SESSIONS: EventType[][] = [
  ['view', 'view', 'click', 'cart'],
  ['view', 'click'],
  ['view', 'view', 'view', 'click', 'cart'],
]

/** The sequence served online (t−4 … t) is the last session above. */
const LIVE_SEQUENCE = SESSIONS[2]

/** Loss curve in 100×40 viewBox coordinates. */
const LOSS_PATH = 'M2 6 C 14 10, 20 22, 32 26 S 52 33, 66 34 S 86 36, 98 36'

/** Illustrative post-training metrics, not real data (the ANN recall is computed). */
const METRICS = [
  { name: 'recall@50', target: 0.412 },
  { name: 'nDCG@10', target: 0.286 },
  { name: 'AUC', target: 0.791 },
] as const

const TRAIN_STEPS_TARGET = 128

export default function MlWorkflow() {
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { margin: '-15% 0px -15% 0px' })
  const reduceMotion = useReducedMotion()

  const [tick, setTick] = useState(0)
  const step = reduceMotion ? HOLD : tick

  // Shared by the ANN viz and the cost panel.
  const [config, setConfig] = useState<Config>(BASELINE)
  const result = probe(config.nprobe)

  useEffect(() => {
    if (!inView || reduceMotion) return
    const id = setInterval(() => {
      setTick((current) => (current >= HOLD ? 0 : current + 1))
    }, 1050)
    return () => clearInterval(id)
  }, [inView, reduceMotion])

  const at = (n: number) => step >= n

  return (
    <section ref={sectionRef} id="work" className="px-gutter py-24 md:py-36">
      <div className="mx-auto max-w-site">
        <SectionHeading eyebrow={`${ALL_STEPS.length} stages`} title={workflow.title} />

        <p className="-mt-6 mb-12 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {workflow.intro.map((paragraph, i) => (
            <span key={i} className={i === 0 ? undefined : 'mt-3 block'}>
              {paragraph}
            </span>
          ))}
        </p>

        <div className="relative overflow-hidden rounded-xl card-surface p-4 md:p-7">
          <div aria-hidden className="pointer-events-none absolute inset-0 dot-grid opacity-40" />

          {/* ================= OFFLINE TRACK ================= */}
          <TrackLabel side="Offline" hint="training" active={step >= 1 && step <= 4} />

          <div className="relative grid gap-4 md:grid-cols-4">
            <Module
              label={workflow.offline[0].label}
              active={at(1)}
              footer={
                <Caption>
                  <span className={TOKEN_TEXT.view}>views</span> ·{' '}
                  <span className={TOKEN_TEXT.click}>clicks</span> ·{' '}
                  <span className={TOKEN_TEXT.cart}>carts</span>
                </Caption>
              }
            >
              <div className="flex h-full flex-col justify-center gap-1.5">
                {LOG_LINES.map(({ width: w, event }, i) => (
                  <motion.span
                    key={i}
                    className={`block h-2 rounded-sm ${TOKEN_CLASS[event]}`}
                    initial={false}
                    animate={{ opacity: at(1) ? 1 : 0.12, scaleX: at(1) ? w : 0.08 }}
                    style={{ originX: 0 }}
                    transition={{ duration: 0.45, delay: at(1) ? i * 0.06 : 0 }}
                  />
                ))}
              </div>
            </Module>

            <Module
              label={workflow.offline[1].label}
              active={at(2)}
              footer={<Caption>raw events → session sequences</Caption>}
            >
              <div className="flex h-full items-center gap-2.5">
                <div className="grid w-[30%] shrink-0 grid-cols-4 gap-[3px]">
                  {RAW_EVENTS.map((event, i) => (
                    <motion.span
                      key={i}
                      className={`aspect-square rounded-xs ${TOKEN_CLASS[event]}`}
                      initial={false}
                      animate={{ opacity: at(2) ? (event === 'noise' ? 0.15 : 0.3) : 0.9 }}
                      transition={{ duration: 0.4, delay: at(2) ? i * 0.02 : 0 }}
                    />
                  ))}
                </div>

                <motion.span
                  className="shrink-0 data-label !text-caption"
                  initial={false}
                  animate={{ color: at(2) ? 'var(--color-primary)' : undefined }}
                  transition={{ duration: 0.4 }}
                >
                  →
                </motion.span>

                <div className="flex flex-1 flex-col gap-[3px]">
                  {SESSIONS.map((session, row) => (
                    <div key={row} className="grid grid-cols-6 gap-[3px]">
                      {Array.from({ length: SESSION_LENGTH }).map((_, col) => {
                        const event = session[col]
                        if (!event) {
                          return (
                            <span
                              key={col}
                              className="aspect-square rounded-xs border border-dashed border-muted-foreground/30"
                            />
                          )
                        }
                        return (
                          <motion.span
                            key={col}
                            className={`aspect-square rounded-xs ${TOKEN_CLASS[event]}`}
                            initial={false}
                            animate={{ opacity: at(2) ? 1 : 0.1, scale: at(2) ? 1 : 0.6 }}
                            transition={{
                              duration: 0.3,
                              delay: at(2) && !reduceMotion ? row * 0.15 + col * 0.05 : 0,
                            }}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </Module>

            <Module
              label={workflow.offline[2].label}
              active={at(3)}
              footer={
                <Caption>
                  step{' '}
                  <Counter
                    target={TRAIN_STEPS_TARGET}
                    active={at(3)}
                    reduceMotion={!!reduceMotion}
                    format={(v) => `${Math.round(v)}k`}
                  />{' '}
                  · converging
                </Caption>
              }
            >
              <svg viewBox="0 0 100 40" className="h-full w-full" aria-hidden>
                <motion.path
                  d={LOSS_PATH}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  initial={false}
                  animate={{ pathLength: at(3) ? 1 : 0, opacity: at(3) ? 1 : 0.2 }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                />
              </svg>
            </Module>

            <Module
              label={workflow.offline[3].label}
              active={at(4)}
              footer={<Caption>held-out sessions</Caption>}
            >
              <div className="flex h-full flex-col justify-center gap-2">
                {METRICS.map((metric) => (
                  <div key={metric.name} className="flex items-baseline justify-between gap-2">
                    <span className="data-label !text-label-sm">{metric.name}</span>
                    <Counter
                      target={metric.target}
                      active={at(4)}
                      reduceMotion={!!reduceMotion}
                      format={(v) => v.toFixed(3)}
                      className="font-mono text-sm text-foreground tabular-nums"
                    />
                  </div>
                ))}
              </div>
            </Module>
          </div>

          {/* ================= DEPLOY ================= */}
          <div className="my-5">
            <TrackLabel side="Deploy" hint="daily rollout" active={at(5)} />
            <DeployBand active={at(5)} reduceMotion={!!reduceMotion} />
          </div>

          {/* ================= ONLINE TRACK ================= */}
          <TrackLabel side="Online" hint="serving" active={step >= 5} />

          <div className="relative grid gap-4 md:grid-cols-4">
            <Module
              label={workflow.online[0].label}
              active={at(5)}
              footer={<Caption>last actions, in order</Caption>}
            >
              <div className="flex h-full items-center gap-1.5">
                {SEQUENCE.map((label, i) => (
                  <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
                    <motion.span
                      className={`aspect-square w-full rounded-sm ${TOKEN_CLASS[LIVE_SEQUENCE[i]]}`}
                      initial={false}
                      animate={{ opacity: at(5) ? 1 : 0.15, scale: at(5) ? 1 : 0.7 }}
                      transition={{ duration: 0.4, delay: at(5) ? i * 0.07 : 0 }}
                    />
                    <span className="data-label !text-label-xs">{label}</span>
                  </div>
                ))}
              </div>
            </Module>

            {/* Five bars are illustrative: sequence length is not fixed. */}
            <Module
              label={workflow.online[1].label}
              active={at(6)}
              footer={<Caption>N item vectors → 1 user vector</Caption>}
            >
              <div className="flex h-full items-end justify-between gap-2 pb-1">
                <div className="flex h-full flex-1 items-end justify-between gap-1">
                  {[44, 62, 38, 70, 52].map((height, i) => (
                    <motion.span
                      key={i}
                      className="w-full rounded-sm bg-muted-foreground/60"
                      initial={false}
                      animate={{
                        height: at(6) ? height * 0.55 : height,
                        opacity: at(6) ? 0.3 : 0.85,
                      }}
                      transition={{
                        duration: 0.6,
                        delay: at(6) ? i * 0.06 : 0,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  ))}
                </div>

                <motion.span
                  className="shrink-0 pb-3 data-label !text-caption"
                  initial={false}
                  animate={{ color: at(6) ? 'var(--color-primary)' : undefined }}
                  transition={{ duration: 0.4 }}
                >
                  →
                </motion.span>

                <div className="flex h-full w-8 shrink-0 items-end">
                  <motion.span
                    className="w-full rounded-sm bg-accent"
                    initial={false}
                    animate={{ height: at(6) ? 78 : 5 }}
                    transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </Module>

            <AnnSearchModule
              active={at(7)}
              userVisible={at(6)}
              reduceMotion={!!reduceMotion}
              result={result}
            />

            <AbTestModule active={at(8)} reduceMotion={!!reduceMotion} />
          </div>

          {/* ================= INTERACTIVE COST MODEL ================= */}
          <div className="mt-5">
            <TrackLabel side="Cost" hint="tune it yourself" active />
            <CostPanel config={config} onChange={setConfig} result={result} />
          </div>

          {/* ================= STEP LABELS ================= */}
          <ol className="relative mt-8 grid gap-x-4 gap-y-3 border-t border-muted pt-6 sm:grid-cols-2 lg:grid-cols-4">
            {ALL_STEPS.map((item, i) => {
              const index = i + 1
              const isActive = step === index
              const isDone = step > index
              return (
                <li key={item.label}>
                  <motion.span
                    className="mb-2 block h-px w-full origin-left"
                    initial={false}
                    animate={{
                      backgroundColor: isActive
                        ? 'var(--color-primary)'
                        : isDone
                          ? 'color-mix(in oklab, var(--color-primary) 35%, transparent)'
                          : 'var(--color-muted)',
                      scaleX: isActive || isDone ? 1 : 0.35,
                    }}
                    transition={{ duration: 0.4 }}
                  />
                  <motion.span
                    className="block data-label"
                    initial={false}
                    animate={{ color: isActive ? 'var(--color-foreground)' : undefined }}
                    transition={{ duration: 0.3 }}
                  >
                    {String(index).padStart(2, '0')} {item.label}
                  </motion.span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground/70">
                    {item.caption}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
