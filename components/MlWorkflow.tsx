'use client'

import { useEffect, useId, useRef, useState } from 'react'
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { SectionHeading } from '@/components/Timeline'
import {
  BASELINE,
  CANDIDATES,
  CELL_SPLIT,
  CENTROIDS,
  K,
  RANGES,
  TRUE_NEAREST,
  USER_POINT,
  cellRect,
  cost,
  probe,
  relativeCost,
  type Config,
} from '@/lib/ann'
import { workflow } from '@/data/cv-data'

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
const UPLIFT_TARGET = 0.7

/** Latency budget as a multiple of baseline cost; leaves room to explore the knobs. */
const BUDGET_MULTIPLE = 4

const DOT_DIM = 'color-mix(in oklab, var(--color-muted-foreground) 50%, var(--color-muted))'

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

/* ---------------------------------------------------------------------------
   Cost panel
   --------------------------------------------------------------------------- */

const KNOBS: Array<{
  key: keyof Config
  label: string
  hint: string
  format: (value: number) => string
}> = [
  { key: 'seqLen', label: 'sequence length', hint: 'N actions', format: (v) => `${v}` },
  { key: 'depth', label: 'model depth', hint: 'L layers', format: (v) => `${v}` },
  { key: 'dim', label: 'embedding dim', hint: 'd', format: (v) => `${v}` },
  { key: 'nprobe', label: 'nprobe', hint: 'cells probed', format: (v) => `${v}` },
]

const COST_PARTS: Array<{
  key: 'ann' | 'ffn' | 'attention' | 'fetch'
  label: string
  tone: string
}> = [
  { key: 'ann', label: 'ann', tone: 'bg-accent' },
  { key: 'ffn', label: 'ffn', tone: 'bg-primary' },
  { key: 'attention', label: 'attention', tone: 'bg-highlight/80' },
  { key: 'fetch', label: 'fetch', tone: 'bg-muted-foreground/70' },
]

/**
 * Four knobs and their effect on recall and latency. The asymmetries follow
 * the real complexities:
 *  - `dim` is the strongest lever (FFN is quadratic in d)
 *  - `seqLen` inflates attention (quadratic in N)
 *  - `nprobe` is the only one that improves recall, at an ANN cost
 *  - `depth` costs linearly without improving recall
 */
function CostPanel({
  config,
  onChange,
  result,
}: {
  config: Config
  onChange: (config: Config) => void
  result: ReturnType<typeof probe>
}) {
  const { recall, missedIndices, probedCells } = result
  const found = K - missedIndices.length
  const breakdown = cost(config)
  const relative = relativeCost(config)
  const budgetUsed = relative / BUDGET_MULTIPLE
  const overBudget = budgetUsed > 1
  const isBaseline = KNOBS.every((knob) => config[knob.key] === BASELINE[knob.key])

  return (
    <div className="rounded-lg border border-muted bg-background/40 p-3 md:p-4">
      <div className="grid gap-5 md:grid-cols-2 md:gap-7">
        <div className="space-y-3">
          {KNOBS.map((knob) => {
            const range = RANGES[knob.key]
            return (
              <label key={knob.key} className="block">
                <span className="mb-1 flex items-baseline justify-between data-label !text-label-xs">
                  <span>
                    {knob.label} <span className="opacity-50">{knob.hint}</span>
                  </span>
                  <span className="font-mono text-foreground">{knob.format(config[knob.key])}</span>
                </span>
                {/* 4px visual track behind a transparent 24px input, for a thumb-sized hit area. */}
                <div className="relative flex h-6 items-center">
                  <span aria-hidden className="absolute inset-x-0 h-1 rounded-full bg-muted" />
                  <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    value={config[knob.key]}
                    onChange={(event) =>
                      onChange({ ...config, [knob.key]: Number(event.target.value) })
                    }
                    aria-label={knob.label}
                    className="relative h-6 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  />
                </div>
              </label>
            )
          })}

          <button
            type="button"
            onClick={() => onChange(BASELINE)}
            disabled={isBaseline}
            className="rounded-full border border-muted px-3 py-1.5 data-label !text-label-xs transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-40"
          >
            reset to baseline
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="block data-label !text-label-xs">recall@{K}</span>
              <span
                className={`font-mono text-2xl tabular-nums ${
                  recall === 1 ? 'text-accent' : 'text-foreground'
                }`}
              >
                {Math.round(recall * 100)}%
              </span>
              <span className="mt-0.5 block data-label !text-micro opacity-70">
                {found}/{K} true neighbors found
              </span>
              <span className="mt-0.5 block data-label !text-micro opacity-60">
                {missedIndices.length === 0
                  ? `all ${K} were inside the ${probedCells.length} probed cells`
                  : `${missedIndices.length} sits in a cell we didn’t probe`}
              </span>
            </div>
            <div className="text-right">
              <span className="block data-label !text-label-xs">serving cost</span>
              <span
                className={`font-mono text-2xl tabular-nums ${
                  overBudget ? 'text-highlight' : 'text-foreground'
                }`}
              >
                ×{relative.toFixed(2)}
              </span>
              <span className="mt-0.5 block data-label !text-micro opacity-60">vs baseline</span>
            </div>
          </div>

          {/* Bar is capped at the budget: the request is cut off when it times out. */}
          <div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-muted/50">
              <div className="absolute inset-0 flex">
                {COST_PARTS.map((part) => {
                  const share = breakdown[part.key] / breakdown.total
                  return (
                    <motion.span
                      key={part.key}
                      className={part.tone}
                      initial={false}
                      animate={{
                        width: `${share * Math.min(budgetUsed, 1) * 100}%`,
                        opacity: overBudget ? 0.45 : 1,
                      }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )
                })}
              </div>

              {overBudget && (
                <motion.span
                  className="absolute inset-y-0 right-0 w-[3px] bg-highlight"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [1, 0.35, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                />
              )}
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="data-label !text-micro opacity-60">latency budget</span>
              <motion.span
                className="data-label !text-label-xs"
                initial={false}
                animate={{
                  color: overBudget ? 'var(--color-highlight)' : 'var(--color-muted-foreground)',
                }}
                transition={{ duration: 0.3 }}
              >
                {overBudget
                  ? `timed out at ×${BUDGET_MULTIPLE}`
                  : `${Math.round(budgetUsed * 100)}% used`}
              </motion.span>
            </div>
          </div>

          <div className="rounded-md border border-muted/70 bg-background/50 p-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="data-label !text-micro">banner served</span>
              <motion.span
                className="data-label !text-micro"
                initial={false}
                animate={{
                  color: overBudget ? 'var(--color-highlight)' : 'var(--color-accent)',
                }}
                transition={{ duration: 0.3 }}
              >
                {overBudget ? 'timeout → fallback' : 'personalised'}
              </motion.span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {[0, 1, 2].map((slot) => (
                <motion.span
                  key={slot}
                  className="h-7 flex-1 rounded-sm border"
                  initial={false}
                  animate={
                    overBudget
                      ? {
                          borderColor: 'var(--color-muted)',
                          backgroundColor:
                            'color-mix(in oklab, var(--color-muted) 60%, transparent)',
                        }
                      : {
                          borderColor: 'color-mix(in oklab, var(--color-accent) 50%, transparent)',
                          backgroundColor:
                            'color-mix(in oklab, var(--color-accent) 12%, transparent)',
                        }
                  }
                  transition={{ duration: 0.35, delay: slot * 0.06 }}
                />
              ))}
            </div>
            <span className="mt-2 block data-label !text-micro opacity-60">
              {overBudget
                ? 'the request is dropped before the neighbors come back'
                : 'the nearest neighbors made it back in time'}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {COST_PARTS.map((part) => (
              <span key={part.key} className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${part.tone}`} />
                <span className="data-label !text-micro">
                  {part.label}{' '}
                  <span className="font-mono text-foreground/80">
                    {Math.round((breakdown[part.key] / breakdown.total) * 100)}%
                  </span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Modules
   --------------------------------------------------------------------------- */

/**
 * ANN search, driven by the shared config. Crosses are the centroids the query
 * compares against to pick cells; hollow dots are true neighbors missed in
 * unprobed cells.
 */
function AnnSearchModule({
  active,
  userVisible,
  reduceMotion,
  result,
}: {
  active: boolean
  userVisible: boolean
  reduceMotion: boolean
  result: ReturnType<typeof probe>
}) {
  const { probedCells, scannedIndices, returnedIndices, missedIndices } = result

  return (
    <Module
      label={workflow.online[2].label}
      active={active}
      footer={
        <div className="space-y-1.5">
          <Caption>
            probing {probedCells.length}/{CENTROIDS.length} cells ·{' '}
            {Math.round(result.scanRatio * 100)}% scanned
          </Caption>
          <div className="flex flex-wrap gap-x-2.5 gap-y-1">
            <LegendMark label="hit" tone="bg-accent" />
            <LegendMark label="missed" ring />
            <LegendMark label="false hit" tone="bg-muted-foreground" />
            <span className="data-label !text-micro opacity-50">dashed = true top {K}</span>
          </div>
        </div>
      }
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        {/* Probed cells */}
        {probedCells.map((cell) => {
          const rect = cellRect(cell)
          return (
            <motion.rect
              key={cell}
              {...rect}
              fill="var(--color-primary)"
              initial={{ opacity: 0 }}
              animate={{ opacity: active ? 0.1 : 0 }}
              transition={{ duration: 0.3 }}
            />
          )
        })}

        {/* Cell boundaries */}
        <line
          x1={CELL_SPLIT.x}
          y1={0}
          x2={CELL_SPLIT.x}
          y2={100}
          stroke="var(--color-muted)"
          strokeWidth={0.5}
        />
        <line
          x1={0}
          y1={CELL_SPLIT.y}
          x2={100}
          y2={CELL_SPLIT.y}
          stroke="var(--color-muted)"
          strokeWidth={0.5}
        />

        {/* Ground truth: the true top K stay circled so false hits are visible. */}
        {active &&
          TRUE_NEAREST.map((index) => (
            <motion.circle
              key={`truth-${index}`}
              cx={CANDIDATES[index].x}
              cy={CANDIDATES[index].y}
              r={5}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={0.6}
              strokeDasharray="1.5 1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              transition={{ duration: 0.35 }}
            />
          ))}

        {/* Candidates: hit (true neighbor returned), missed (true neighbor in an
            unprobed cell), false positive (returned but not in the true top K),
            or ignored. */}
        {CANDIDATES.map((point, index) => {
          const isScanned = scannedIndices.includes(index)
          const isReturned = active && returnedIndices.includes(index)
          const isTruth = TRUE_NEAREST.includes(index)
          const isMissed = active && missedIndices.includes(index)
          const isHit = isReturned && isTruth
          const isFalsePositive = isReturned && !isTruth

          return (
            <motion.circle
              key={index}
              cx={point.x}
              cy={point.y}
              // Fill is a CSS transition: Motion can't interpolate `var()` on SVG fill.
              className="transition-[fill] duration-300"
              style={{
                fill: isHit
                  ? 'var(--color-accent)'
                  : isFalsePositive
                    ? 'var(--color-muted-foreground)'
                    : isMissed
                      ? 'transparent'
                      : DOT_DIM,
              }}
              initial={false}
              animate={{
                r: isHit ? 3 : isFalsePositive ? 2.6 : isMissed ? 2 : 1.6,
                opacity: active && !isScanned && !isTruth ? 0.3 : 1,
              }}
              transition={{ duration: 0.3 }}
            />
          )
        })}

        {/* Centroids */}
        {CENTROIDS.map((centroid) => {
          const probed = probedCells.includes(centroid.cell)
          const arm = 2.2
          return (
            <motion.g
              key={`centroid-${centroid.cell}`}
              initial={false}
              animate={{ opacity: probed ? 1 : 0.4 }}
              transition={{ duration: 0.3 }}
            >
              <line
                x1={centroid.x - arm}
                y1={centroid.y - arm}
                x2={centroid.x + arm}
                y2={centroid.y + arm}
                stroke={probed ? 'var(--color-primary)' : 'var(--color-muted-foreground)'}
                strokeWidth={0.7}
              />
              <line
                x1={centroid.x - arm}
                y1={centroid.y + arm}
                x2={centroid.x + arm}
                y2={centroid.y - arm}
                stroke={probed ? 'var(--color-primary)' : 'var(--color-muted-foreground)'}
                strokeWidth={0.7}
              />
            </motion.g>
          )
        })}

        {/* Edges to returned neighbors; dashed grey for false positives. */}
        {active &&
          returnedIndices.map((index) => {
            const isTruth = TRUE_NEAREST.includes(index)
            return (
              <motion.line
                key={`edge-${index}`}
                x1={USER_POINT.x}
                y1={USER_POINT.y}
                x2={CANDIDATES[index].x}
                y2={CANDIDATES[index].y}
                stroke={isTruth ? 'var(--color-accent)' : 'var(--color-muted-foreground)'}
                strokeWidth={0.7}
                strokeDasharray={isTruth ? undefined : '1.5 1.5'}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: isTruth ? 0.85 : 0.5 }}
                transition={{ duration: 0.3 }}
              />
            )
          })}

        {active && !reduceMotion && (
          <motion.circle
            cx={USER_POINT.x}
            cy={USER_POINT.y}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={0.6}
            initial={{ r: 3, opacity: 0.9 }}
            animate={{ r: 40, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {/* No overshooting easing on `r`: a negative radius is invalid SVG. */}
        <motion.circle
          cx={USER_POINT.x}
          cy={USER_POINT.y}
          fill="var(--color-primary)"
          initial={false}
          animate={{ r: userVisible ? 3.4 : 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </Module>
  )
}

/**
 * A/B test: 50/50 traffic split, then the uplift's 80% confidence interval
 * narrows until it excludes zero, which makes the result significant.
 * Illustrative numbers.
 */
const UPLIFT_AXIS = { min: -1.5, max: 2.5 }
const UPLIFT_CI_EARLY = { low: -1.2, high: 2.2 }
const UPLIFT_CI_FINAL = { low: 0.35, high: 1.05 }

function upliftToPercent(v: number): number {
  return ((v - UPLIFT_AXIS.min) / (UPLIFT_AXIS.max - UPLIFT_AXIS.min)) * 100
}

function AbTestModule({ active, reduceMotion }: { active: boolean; reduceMotion: boolean }) {
  const lanes = [
    { name: 'ctrl', tone: 'bg-muted-foreground/70', share: 50 },
    { name: 'var', tone: 'bg-primary', share: 50 },
  ]
  const ci = active ? UPLIFT_CI_FINAL : UPLIFT_CI_EARLY

  return (
    <Module
      label={workflow.online[3].label}
      active={active}
      footer={
        <motion.div
          className="flex items-center justify-between"
          initial={false}
          animate={{ opacity: active ? 1 : 0.2 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Caption>50/50 · new config</Caption>
          <motion.span
            className="rounded-full px-1.5 py-px font-mono text-label-sm tracking-wide"
            initial={false}
            animate={{
              backgroundColor: active
                ? 'color-mix(in oklab, var(--color-accent) 15%, transparent)'
                : 'rgba(0, 0, 0, 0)',
              color: active ? 'var(--color-accent)' : 'var(--color-muted-foreground)',
            }}
            transition={{ duration: 0.3, delay: active && !reduceMotion ? 1.1 : 0 }}
          >
            significant
          </motion.span>
        </motion.div>
      }
    >
      <div className="flex h-full flex-col justify-center gap-2.5">
        {lanes.map((lane, laneIndex) => (
          <div key={lane.name} className="flex items-center gap-2">
            <span className="w-8 shrink-0 data-label !text-label-xs">{lane.name}</span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
              <motion.span
                className={`absolute inset-y-0 left-0 ${lane.tone}`}
                initial={false}
                animate={{ width: active ? `${lane.share}%` : '0%' }}
                transition={{ duration: 0.8, delay: laneIndex * 0.12, ease: [0.22, 1, 0.36, 1] }}
              />
              {active &&
                !reduceMotion &&
                Array.from({ length: 4 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute top-1/2 size-1 -translate-y-1/2 rounded-full bg-background/80"
                    initial={{ left: '-6%' }}
                    animate={{ left: `${lane.share}%` }}
                    transition={{
                      duration: 1.6,
                      delay: i * 0.4 + laneIndex * 0.2,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                ))}
            </div>
            <span className="w-7 shrink-0 text-right data-label !text-label-xs">{lane.share}%</span>
          </div>
        ))}

        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="data-label !text-label-xs">ctr uplift · 80% ci</span>
            <Counter
              target={UPLIFT_TARGET}
              active={active}
              reduceMotion={reduceMotion}
              format={(v) => `+${v.toFixed(1)}%`}
              className="font-mono text-sm text-accent tabular-nums"
            />
          </div>
          <div className="relative h-3">
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-muted" />
            <span
              className="absolute top-0 h-full w-px bg-muted-foreground/60"
              style={{ left: `${upliftToPercent(0)}%` }}
            />
            <motion.span
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent/35"
              initial={false}
              animate={{
                left: `${upliftToPercent(ci.low)}%`,
                width: `${upliftToPercent(ci.high) - upliftToPercent(ci.low)}%`,
              }}
              transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
            <span
              className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
              style={{ left: `${upliftToPercent(UPLIFT_TARGET)}%` }}
            />
          </div>
        </div>
      </div>
    </Module>
  )
}

/**
 * Deployment: both model versions stay loaded on the inference server, each
 * paired with its own ANN index, and only request routing switches. A model
 * and its index must share a version, otherwise user and item embeddings live
 * in different vector spaces.
 *
 * A time cursor sweeps the QPS chart; the v1/v2 cards and routing label follow
 * its phase (v1 only, both, v2 only).
 */
const ROLLOUT_SWEEP_SECONDS = 4.6

type RolloutPhase = 'v1' | 'both' | 'v2'

function phaseAt(t: number): RolloutPhase {
  if (t < ROLLOUT_START) return 'v1'
  if (t < ROLLOUT_END) return 'both'
  return 'v2'
}

const ROUTING_LABEL: Record<RolloutPhase, string> = {
  v1: 'requests target v1',
  both: 'requests split v1 + v2',
  v2: 'requests target v2',
}

function DeployBand({ active, reduceMotion }: { active: boolean; reduceMotion: boolean }) {
  const progress = useMotionValue(reduceMotion ? 1 : 0)
  const [phase, setPhase] = useState<RolloutPhase>(reduceMotion ? 'v2' : 'v1')

  useMotionValueEvent(progress, 'change', (t) => setPhase(phaseAt(t)))

  useEffect(() => {
    if (reduceMotion) {
      progress.set(1)
      return
    }
    if (!active) {
      progress.set(0)
      return
    }
    const controls = animate(progress, 1, { duration: ROLLOUT_SWEEP_SECONDS, ease: 'linear' })
    return () => controls.stop()
  }, [active, reduceMotion, progress])

  const versions = [
    { tag: 'v1', note: 'yesterday', serving: phase !== 'v2' },
    { tag: 'v2', note: 'today', serving: phase !== 'v1' },
  ]

  return (
    <div className="rounded-lg border border-muted bg-background/40 p-3">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="data-label !text-label-sm">inference server · both versions loaded</span>
        <span
          className={`data-label !text-label-xs transition-colors ${
            phase === 'v1' ? '' : '!text-primary'
          }`}
        >
          {ROUTING_LABEL[phase]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {versions.map((version) => (
          <motion.div
            key={version.tag}
            className="rounded-md border p-2"
            initial={false}
            animate={{
              borderColor: version.serving
                ? 'color-mix(in oklab, var(--color-primary) 60%, transparent)'
                : 'var(--color-muted)',
              opacity: version.serving ? 1 : 0.5,
            }}
            transition={{ duration: 0.35 }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-foreground">{version.tag}</span>
              <span className="data-label !text-micro">
                {version.serving ? `${version.note} · serving` : version.note}
              </span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {['model', 'ann index'].map((artifact) => (
                <motion.span
                  key={artifact}
                  className="flex-1 rounded-sm border px-1.5 py-1 text-center font-mono text-label-xs"
                  initial={false}
                  animate={{
                    borderColor: version.serving
                      ? 'color-mix(in oklab, var(--color-primary) 45%, transparent)'
                      : 'var(--color-muted)',
                    color: version.serving
                      ? 'var(--color-primary)'
                      : 'var(--color-muted-foreground)',
                  }}
                  transition={{ duration: 0.35 }}
                >
                  {artifact}
                </motion.span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <QpsRolloutChart progress={progress} />
    </div>
  )
}

/**
 * Illustrative ~30 min QPS chart (not real data): v2 ramps up from zero while
 * v1 ramps down over a short rollout window.
 */
const QPS_W = 300
const QPS_H = 64
const QPS_POINTS = 90
const ROLLOUT_START = 0.38
const ROLLOUT_END = 0.62

function qpsAt(t: number): number {
  // Near-constant traffic with a small measured-looking ripple.
  return 0.8 + 0.035 * Math.sin(2 * Math.PI * t * 5) + 0.02 * Math.sin(2 * Math.PI * t * 13 + 1)
}

function v2ShareAt(t: number): number {
  const x = Math.min(1, Math.max(0, (t - ROLLOUT_START) / (ROLLOUT_END - ROLLOUT_START)))
  return x * x * (3 - 2 * x)
}

const QPS_PATHS = (() => {
  const toY = (v: number) => QPS_H - v * QPS_H * 0.92
  const pts = Array.from({ length: QPS_POINTS }, (_, i) => {
    const t = i / (QPS_POINTS - 1)
    const total = qpsAt(t)
    const share = v2ShareAt(t)
    return { x: t * QPS_W, v1: toY(total * (1 - share)), v2: toY(total * share) }
  })
  const build = (key: 'v1' | 'v2') => {
    const line = pts.map((p) => `${p.x.toFixed(1)},${p[key].toFixed(1)}`).join(' L')
    return { line: `M${line}`, area: `M0,${QPS_H} L${line} L${QPS_W},${QPS_H} Z` }
  }
  return { v1: build('v1'), v2: build('v2') }
})()

function QpsRolloutChart({ progress }: { progress: MotionValue<number> }) {
  // useId output contains characters that url(#…) doesn't resolve everywhere.
  const clipId = `qps-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const clipWidth = useTransform(progress, (t) => t * QPS_W)
  const cursorLeft = useTransform(progress, (t) => `${t * 100}%`)

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="data-label !text-label-xs">qps · last 30 min</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-muted-foreground/40" />
            <span className="data-label !text-micro">v1</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-primary/60" />
            <span className="data-label !text-micro">v2</span>
          </span>
        </span>
      </div>

      <div className="relative pt-4">
        <span
          className="absolute top-0 -translate-x-1/2 data-label !text-micro !text-primary"
          style={{ left: `${((ROLLOUT_START + ROLLOUT_END) / 2) * 100}%` }}
        >
          rollout · both serving
        </span>
        <div className="relative">
          {/* Fixed height; areas stretch horizontally. */}
          <svg
            viewBox={`0 0 ${QPS_W} ${QPS_H}`}
            preserveAspectRatio="none"
            className="block h-20 w-full"
            role="img"
            aria-label="Illustrative QPS chart: v2 starts from zero and takes over v1's traffic during a short rollout window"
          >
            <defs>
              <clipPath id={clipId}>
                <motion.rect x={0} y={-10} height={QPS_H + 30} width={clipWidth} />
              </clipPath>
            </defs>

            <rect
              x={ROLLOUT_START * QPS_W}
              y={0}
              width={(ROLLOUT_END - ROLLOUT_START) * QPS_W}
              height={QPS_H}
              className="fill-primary/[0.06]"
            />
            {[ROLLOUT_START, ROLLOUT_END].map((edge) => (
              <line
                key={edge}
                x1={edge * QPS_W}
                x2={edge * QPS_W}
                y1={0}
                y2={QPS_H}
                className="stroke-primary/40"
                strokeDasharray="2 3"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <g clipPath={`url(#${clipId})`}>
              <path d={QPS_PATHS.v1.area} className="fill-muted-foreground/20" />
              <path d={QPS_PATHS.v2.area} className="fill-primary/30" />
              <path
                d={QPS_PATHS.v1.line}
                className="fill-none stroke-muted-foreground"
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={QPS_PATHS.v2.line}
                className="fill-none stroke-primary"
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
              />
            </g>

            <line
              x1={0}
              x2={QPS_W}
              y1={QPS_H}
              y2={QPS_H}
              className="stroke-muted"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-px bg-foreground/70"
            style={{ left: cursorLeft }}
          >
            <span className="absolute -top-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-foreground" />
          </motion.div>
        </div>
      </div>
      <div className="mt-1 flex justify-between">
        <span className="data-label !text-micro">−30 min</span>
        <span className="data-label !text-micro">now</span>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Primitives
   --------------------------------------------------------------------------- */

function TrackLabel({ side, hint, active }: { side: string; hint: string; active: boolean }) {
  return (
    <div className="relative mb-3 flex items-center gap-3">
      <motion.span
        className="data-label !text-caption"
        initial={false}
        animate={{ color: active ? 'var(--color-primary)' : undefined }}
        transition={{ duration: 0.3 }}
      >
        {side}
      </motion.span>
      <span className="data-label !text-label-sm opacity-60">{hint}</span>
      <div className="h-px flex-1 bg-muted" />
    </div>
  )
}

function Caption({ children }: { children: React.ReactNode }) {
  return <span className="block data-label !text-label-sm">{children}</span>
}

function LegendMark({
  label,
  tone,
  ring = false,
}: {
  label: string
  tone?: string
  ring?: boolean
}) {
  return (
    <span className="flex items-center gap-1">
      <span
        className={`size-1.5 rounded-full ${
          ring ? 'border border-muted-foreground' : (tone ?? 'bg-muted-foreground')
        }`}
      />
      <span className="data-label !text-micro">{label}</span>
    </span>
  )
}

/**
 * Workflow cell. The visual area has a fixed height so the grid never jumps
 * between steps; captions go in `footer` since `children` can't grow.
 */
function Module({
  label,
  active,
  footer,
  children,
}: {
  label: string
  active: boolean
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <motion.div
      className="relative flex flex-col rounded-lg border bg-background/40 p-3"
      initial={false}
      animate={{
        borderColor: active
          ? 'color-mix(in oklab, var(--color-primary) 55%, transparent)'
          : 'var(--color-muted)',
      }}
      transition={{ duration: 0.45 }}
    >
      <span className="mb-2 block data-label !text-label-sm">{label}</span>
      <div className="h-24">{children}</div>
      {footer && <div className="mt-2 min-h-4">{footer}</div>}
    </motion.div>
  )
}

/** Counts up to `target`, rendering the MotionValue directly to avoid a setState per frame. */
function Counter({
  target,
  active,
  reduceMotion,
  format,
  className,
}: {
  target: number
  active: boolean
  reduceMotion: boolean
  format: (value: number) => string
  className?: string
}) {
  const value = useMotionValue(0)
  const text = useTransform(value, format)

  useEffect(() => {
    if (!active) {
      value.set(0)
      return
    }
    if (reduceMotion) {
      value.set(target)
      return
    }
    const controls = animate(value, target, { duration: 1, ease: 'easeOut' })
    return () => controls.stop()
  }, [active, target, value, reduceMotion])

  return <motion.span className={className}>{text}</motion.span>
}
