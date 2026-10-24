import { motion } from 'motion/react'
import { workflow } from '@/data/cv-data'
import { Caption, Module, Counter } from './primitives'

/**
 * A/B test: 50/50 traffic split, then the uplift's 80% confidence interval
 * narrows until it excludes zero, which makes the result significant.
 * Illustrative numbers.
 */

const UPLIFT_TARGET = 0.7

const UPLIFT_AXIS = { min: -1.5, max: 2.5 }
const UPLIFT_CI_EARLY = { low: -1.2, high: 2.2 }
const UPLIFT_CI_FINAL = { low: 0.35, high: 1.05 }

function upliftToPercent(v: number): number {
  return ((v - UPLIFT_AXIS.min) / (UPLIFT_AXIS.max - UPLIFT_AXIS.min)) * 100
}

export function AbTestModule({ active, reduceMotion }: { active: boolean; reduceMotion: boolean }) {
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
