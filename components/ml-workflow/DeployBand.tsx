import { useEffect, useId, useState } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from 'motion/react'

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

export function DeployBand({ active, reduceMotion }: { active: boolean; reduceMotion: boolean }) {
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
