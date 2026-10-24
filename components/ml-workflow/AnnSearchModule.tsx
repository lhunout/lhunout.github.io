import { motion } from 'motion/react'
import {
  CANDIDATES,
  CELL_SPLIT,
  CENTROIDS,
  K,
  TRUE_NEAREST,
  USER_POINT,
  cellRect,
  probe,
} from '@/lib/ann'
import { workflow } from '@/data/cv-data'
import { Caption, LegendMark, Module } from './primitives'

const DOT_DIM = 'color-mix(in oklab, var(--color-muted-foreground) 50%, var(--color-muted))'

/**
 * ANN search, driven by the shared config. Crosses are the centroids the query
 * compares against to pick cells; hollow dots are true neighbors missed in
 * unprobed cells.
 */
export function AnnSearchModule({
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
