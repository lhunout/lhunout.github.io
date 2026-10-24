/**
 * ANN index geometry and serving-path cost model, kept free of React.
 * Displayed recall and latency are derived from the point layout and real
 * operation complexities, not hard-coded.
 */

type Point = { x: number; y: number }

/** Product catalog projected to 2D, in % of the frame. */
export const CANDIDATES: Point[] = [
  { x: 12, y: 22 },
  { x: 26, y: 12 },
  { x: 38, y: 30 },
  { x: 18, y: 44 },
  { x: 8, y: 62 },
  { x: 30, y: 56 },
  { x: 44, y: 68 },
  { x: 22, y: 78 },
  { x: 52, y: 18 },
  { x: 62, y: 34 },
  { x: 74, y: 14 },
  { x: 86, y: 26 },
  { x: 92, y: 46 },
  { x: 78, y: 56 },
  { x: 66, y: 72 },
  { x: 88, y: 76 },
  { x: 56, y: 86 },
  { x: 40, y: 90 },
  { x: 72, y: 90 },
  { x: 14, y: 88 },
  { x: 48, y: 46 },
  { x: 34, y: 40 },
  { x: 60, y: 56 },
  { x: 82, y: 40 },
  { x: 20, y: 32 },
  { x: 46, y: 58 },
  { x: 68, y: 24 },
  { x: 30, y: 68 },
]

/** Query: the user embedding produced by inference. */
export const USER_POINT: Point = { x: 56, y: 44 }

export const K = 3

/** The index is split into a 2×2 grid of cells. */
export const CELL_SPLIT = { x: 50, y: 50 }
const CELL_COUNT = 4

function cellOf(point: Point): number {
  return (point.x >= CELL_SPLIT.x ? 1 : 0) + (point.y >= CELL_SPLIT.y ? 2 : 0)
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function cellRect(cell: number) {
  return {
    x: cell % 2 === 1 ? CELL_SPLIT.x : 0,
    y: cell >= 2 ? CELL_SPLIT.y : 0,
    width: CELL_SPLIT.x,
    height: CELL_SPLIT.y,
  }
}

type Centroid = Point & { cell: number; size: number }

/**
 * Mean of each cell's points. Probing compares the query against these, not
 * against the geometric cell centers.
 */
export const CENTROIDS: Centroid[] = Array.from({ length: CELL_COUNT }, (_, cell) => {
  const members = CANDIDATES.filter((point) => cellOf(point) === cell)
  const sum = members.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return {
    cell,
    x: sum.x / members.length,
    y: sum.y / members.length,
    size: members.length,
  }
})

const CELLS_BY_PROXIMITY: number[] = [...CENTROIDS]
  .sort((a, b) => distance(a, USER_POINT) - distance(b, USER_POINT))
  .map((centroid) => centroid.cell)

/** Exact K nearest neighbors from a full scan: the ground truth. */
export const TRUE_NEAREST: number[] = CANDIDATES.map((point, index) => ({
  index,
  d: distance(point, USER_POINT),
}))
  .sort((a, b) => a.d - b.d)
  .slice(0, K)
  .map((entry) => entry.index)

type ProbeResult = {
  probedCells: number[]
  scannedIndices: number[]
  returnedIndices: number[]
  /** True neighbors missed because their cell was not probed. */
  missedIndices: number[]
  recall: number
  scanRatio: number
}

/** Simulates a search that probes the `nprobe` closest cells. */
export function probe(nprobe: number): ProbeResult {
  const probedCells = CELLS_BY_PROXIMITY.slice(0, nprobe)

  const scanned = CANDIDATES.map((point, index) => ({ point, index })).filter(({ point }) =>
    probedCells.includes(cellOf(point)),
  )

  const returnedIndices = [...scanned]
    .sort((a, b) => distance(a.point, USER_POINT) - distance(b.point, USER_POINT))
    .slice(0, K)
    .map(({ index }) => index)

  const missedIndices = TRUE_NEAREST.filter((index) => !returnedIndices.includes(index))

  return {
    probedCells,
    scannedIndices: scanned.map(({ index }) => index),
    returnedIndices,
    missedIndices,
    recall: (K - missedIndices.length) / K,
    scanRatio: scanned.length / CANDIDATES.length,
  }
}

/* ---------------------------------------------------------------------------
   Cost model
   --------------------------------------------------------------------------- */

export type Config = {
  /** User action sequence length. */
  seqLen: number
  /** Number of sequence-model layers. */
  depth: number
  /** Embedding dimension. */
  dim: number
  /** Number of index cells probed. */
  nprobe: number
}

export const BASELINE: Config = { seqLen: 20, depth: 4, dim: 64, nprobe: 2 }

export const RANGES = {
  seqLen: { min: 5, max: 100, step: 5 },
  depth: { min: 1, max: 12, step: 1 },
  dim: { min: 32, max: 512, step: 32 },
  nprobe: { min: 1, max: CELL_COUNT, step: 1 },
} as const

type CostBreakdown = {
  fetch: number
  attention: number
  ffn: number
  ann: number
  total: number
}

/**
 * Index scale used for cost, deliberately larger than the 28 drawn points:
 * at that size ANN would look almost free, whereas scanning probed cells is a
 * major serving cost on a multi-million-vector catalog.
 */
const INDEX_CENTROIDS = 4096
const VECTORS_PER_PROBE = 4000

/**
 * Per-item lookup cost. Sequence item embeddings are read from the same large
 * index the search queries, so each is a scattered access, not a free read;
 * this term dominates the vector size at small dimensions.
 */
const INDEX_LOOKUP = 3200

/**
 * Relative serving-path cost in arbitrary units. Only the complexity shapes
 * are claimed, never absolute milliseconds:
 *   fetch      N·(d + lookup)   N reads from the same index as the search
 *   attention  L·N²·d           quadratic in sequence length
 *   ffn        L·N·d²           quadratic in embedding dimension
 *   ann        (C + p·V)·d      linear in probed cells and dimension
 */
export function cost(config: Config): CostBreakdown {
  const { seqLen, depth, dim, nprobe } = config

  const fetch = seqLen * (dim + INDEX_LOOKUP)
  const attention = depth * seqLen * seqLen * dim
  const ffn = depth * seqLen * dim * dim
  const ann = (INDEX_CENTROIDS + nprobe * VECTORS_PER_PROBE) * dim

  return { fetch, attention, ffn, ann, total: fetch + attention + ffn + ann }
}

/** Total cost relative to the baseline config. */
export function relativeCost(config: Config): number {
  return cost(config).total / cost(BASELINE).total
}
