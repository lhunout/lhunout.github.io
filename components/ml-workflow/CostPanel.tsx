import { motion } from 'motion/react'
import { BASELINE, K, RANGES, cost, probe, relativeCost, type Config } from '@/lib/ann'

/** Latency budget as a multiple of baseline cost; leaves room to explore the knobs. */
const BUDGET_MULTIPLE = 4

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
export function CostPanel({
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
