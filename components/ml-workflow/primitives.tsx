import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'

export function TrackLabel({
  side,
  hint,
  active,
}: {
  side: string
  hint: string
  active: boolean
}) {
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

export function Caption({ children }: { children: React.ReactNode }) {
  return <span className="block data-label !text-label-sm">{children}</span>
}

export function LegendMark({
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
export function Module({
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
export function Counter({
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
