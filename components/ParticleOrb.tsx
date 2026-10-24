'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { themeColor, useTheme } from '@/lib/theme'

/**
 * Hero background: a calligraphic joined "LH" monogram rendered as WebGL
 * particles. The stroke is a tube whose surface is seeded with twinkling points
 * that flow along it, swirl around its axis and slowly morph.
 */

/** Radius of the monogram's bounding sphere, in scene units before group scale. */
const SHELL_RADIUS = 1.48

const CAMERA_FOV = 38

type OrbFit = {
  position: [number, number, number]
  scale: number
  cameraZ: number
}

type OrbLayout = OrbFit & {
  /** CSS mask center (%), follows the monogram. */
  maskCenterXPercent: number
  maskCenterYPercent: number
}

/** Headroom for morphing, jitter and point size. */
const ROTATION_MARGIN = 1.03
/** Usable fraction of the frustum; the rest is padding to the screen edge. */
const FRUSTUM_MARGIN = 0.9

function viewHalfHeight(cameraZ: number): number {
  const halfFovRad = (CAMERA_FOV / 2) * (Math.PI / 180)
  return Math.tan(halfFovRad) * cameraZ
}

/** Largest scale that keeps the shell inside the frustum on all four sides at z = 0. */
function maxScaleForFrustum(
  cameraZ: number,
  aspect: number,
  centerX: number,
  centerY: number,
  sideMargin: number,
): number {
  const outerR = SHELL_RADIUS * ROTATION_MARGIN
  const halfH = viewHalfHeight(cameraZ)
  const halfW = halfH * aspect
  const m = FRUSTUM_MARGIN

  const fromTop = (halfH * m - centerY) / outerR
  const fromBottom = (halfH * m + centerY) / outerR
  const fromRight = (halfW * sideMargin - centerX) / outerR
  const fromLeft = (halfW * sideMargin + centerX) / outerR

  return Math.min(fromTop, fromBottom, fromRight, fromLeft)
}

/** Pulls the camera back while that lets the scale grow toward the target without clipping. */
function fitOrbLayout(
  aspect: number,
  targetScale: number,
  centerX: number,
  centerY: number,
  startCameraZ: number,
  sideMargin: number,
): OrbFit {
  const maxScale = (z: number) => maxScaleForFrustum(z, aspect, centerX, centerY, sideMargin)
  let cameraZ = startCameraZ
  let scale = Math.min(targetScale, maxScale(cameraZ))

  for (let step = 0; step < 14 && scale < targetScale * 0.97; step++) {
    cameraZ += 0.12
    scale = Math.min(targetScale, maxScale(cameraZ))
  }

  return {
    position: [centerX, centerY, 0],
    scale: Math.max(0.55, scale),
    cameraZ,
  }
}

/**
 * Bottom of the floating nav. offsetTop/offsetHeight ignore the Motion `y`
 * transform applied during its entrance animation.
 */
function readNavBottomPx(): number {
  if (typeof document === 'undefined') return 74
  const nav = document.querySelector<HTMLElement>('header nav')
  return nav ? nav.offsetTop + nav.offsetHeight : 74
}

/** Desktop horizontal center (fraction of width), to the right of the hero text. */
const DESKTOP_CENTER_X = 0.63

/** Desktop: right of the hero text. Mobile/tablet: centered. Vertically centered below the nav. */
function layoutForViewport(width: number, height: number, navBottomPx: number): OrbLayout {
  const aspect = width / Math.max(height, 1)
  const startZ = width < 640 ? 3.25 : width < 1024 ? 3.15 : 3.05
  const targetScale = width < 640 ? 1.15 : width < 1024 ? 1.2 : 1.25

  // On portrait mobile width is the constraint: let it overflow slightly, the CSS mask fades the edges.
  const sideMargin = width < 640 ? 1.2 : FRUSTUM_MARGIN

  const centerXPx = width >= 1024 ? width * DESKTOP_CENTER_X : width / 2
  const centerYPx = (navBottomPx + height) / 2
  const offsetFractionX = (centerXPx - width / 2) / (width / 2)
  const offsetFractionY = (centerYPx - height / 2) / (height / 2)

  let layout = fitOrbLayout(aspect, targetScale, 0, 0, startZ, sideMargin)
  for (let pass = 0; pass < 3; pass++) {
    const halfH = viewHalfHeight(layout.cameraZ)
    const centerX = offsetFractionX * halfH * aspect
    const centerY = -offsetFractionY * halfH
    layout = fitOrbLayout(aspect, targetScale, centerX, centerY, layout.cameraZ, sideMargin)
  }

  return {
    ...layout,
    maskCenterXPercent: (centerXPx / width) * 100,
    maskCenterYPercent: (centerYPx / height) * 100,
  }
}

/** Theme tokens: ink-colored points with ~1 in 8 clay orange. */
const RIBBON_PALETTE = [
  'foreground',
  'foreground',
  'ink-soft',
  'foreground',
  'ink-faint',
  'foreground',
  'ink-soft',
  'primary-light',
]

/**
 * Joined "LH" monogram as one continuous stroke, letters spanning y = -1..1
 * before slant. Points are evenly spaced (~0.15–0.25) along smooth arcs: uneven
 * spacing shows up as kinks in the Catmull-Rom curve. Depth (z) is added in buildStroke.
 */
const STROKES: [number, number][][] = [
  [
    // L: long lead-in from the left, upstroke crossing the stem
    [-1.6, 0.0],
    [-1.38, 0.15],
    [-1.14, 0.32],
    [-0.9, 0.5],
    [-0.67, 0.68],
    [-0.48, 0.86],
    // L: large round top loop, closing to the left
    [-0.36, 1.04],
    [-0.38, 1.2],
    [-0.52, 1.3],
    [-0.72, 1.3],
    [-0.9, 1.18],
    [-0.98, 0.98],
    // L: descending stem, recrossing the upstroke
    [-0.98, 0.7],
    [-0.99, 0.38],
    [-1.02, 0.04],
    [-1.06, -0.3],
    [-1.12, -0.6],
    // L: foot loop
    [-1.2, -0.84],
    [-1.34, -0.98],
    [-1.5, -0.98],
    [-1.58, -0.84],
    [-1.5, -0.7],
    [-1.3, -0.66],
    [-1.08, -0.74],
    // L: sweeping base leading to the foot of the H's left stem
    [-0.84, -0.86],
    [-0.56, -0.95],
    [-0.3, -0.96],
    [-0.08, -0.9],
    // Connector: thin upstroke retracing the H's left stem so it reads as a single stem
    [0.04, -0.62],
    [0.07, -0.36],
    [0.1, -0.06],
    [0.13, 0.24],
    [0.16, 0.54],
    [0.2, 0.82],
    // H: left stem head loop (same size as the right one)
    [0.32, 1.04],
    [0.36, 1.24],
    [0.24, 1.36],
    [0.06, 1.32],
    [-0.02, 1.12],
    [0.06, 0.9],
    // H: left stem downstroke
    [0.15, 0.62],
    [0.12, 0.3],
    [0.09, -0.02],
    [0.06, -0.34],
    [0.04, -0.64],
    // H: small bottom turn, then back up the stem to the crossbar
    [0.06, -0.9],
    [0.14, -0.98],
    [0.18, -0.82],
    [0.13, -0.56],
    [0.12, -0.26],
    [0.14, 0.02],
    // H: raised, slightly arched crossbar
    [0.24, 0.18],
    [0.42, 0.25],
    [0.62, 0.28],
    [0.82, 0.27],
    [0.98, 0.22],
    // H: up the right stem to its head
    [1.06, 0.4],
    [1.1, 0.62],
    [1.14, 0.84],
    // H: right stem head loop
    [1.26, 1.04],
    [1.3, 1.24],
    [1.18, 1.36],
    [1.0, 1.32],
    [0.92, 1.12],
    [1.0, 0.9],
    // H: right stem downstroke
    [1.09, 0.62],
    [1.06, 0.3],
    [1.02, -0.02],
    [0.98, -0.34],
    [0.95, -0.64],
    // Long exit flourish
    [0.97, -0.88],
    [1.08, -1.0],
    [1.26, -1.0],
    [1.48, -0.92],
    [1.68, -0.8],
    [1.86, -0.64],
  ],
]

/** Italic slant: x += y * SLANT. */
const SLANT = 0.22

/** Curve segments per unit length, for sampling and Frenet frames. */
const SEGMENTS_PER_UNIT = 60
/** Control-point morph amplitude; kept small so the letters stay legible. */
const MORPH_AMPLITUDE = 0.022
/** Max tube radius (thickest strokes), relative to letter height. */
const TUBE_RADIUS = 0.13

type RibbonParticle = {
  stroke: Uint8Array
  /** Phase in [0, 1), mapped to curve position u through the inverse CDF. */
  u: Float32Array
  angle: Float32Array
  radial: Float32Array
}

/** Bounding-box center of the monogram, used to recenter it on the origin. */
const STROKES_CENTER = new THREE.Box3()
  .setFromPoints(STROKES.flat().map(([x, y]) => new THREE.Vector3(x + y * SLANT, y, 0)))
  .getCenter(new THREE.Vector3())

function buildStroke(index: number, t: number): THREE.CatmullRomCurve3 {
  const pts = STROKES[index].map(([x, y], i) => {
    // Phase grows slowly along the stroke so neighbors move together: the
    // letters sway as a whole instead of twisting locally.
    const p = index * 2.3 + i * 0.22
    return new THREE.Vector3(
      x + y * SLANT + Math.sin(t * 0.35 + p) * MORPH_AMPLITUDE,
      y + Math.cos(t * 0.28 + p * 1.3) * MORPH_AMPLITUDE,
      Math.sin(i * 0.18) * 0.06 + Math.sin(t * 0.22 + p * 0.7) * MORPH_AMPLITUDE * 2,
    ).sub(STROKES_CENTER)
  })
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal')
}

const STROKE_LENGTHS = STROKES.map((_, i) => buildStroke(i, 0).getLength())
const STROKE_SEGMENTS = STROKE_LENGTHS.map((len) =>
  Math.max(8, Math.round(len * SEGMENTS_PER_UNIT)),
)

/** Nib angle from horizontal: strokes parallel to the nib are thinnest. */
const NIB_ANGLE = (40 * Math.PI) / 180

/**
 * Relative stroke width from direction, in [0.4, ~0.95]. Blends a pointed-pen
 * model (thick downstrokes) with a broad-nib angle so horizontals land
 * between hairlines and downstrokes.
 */
function penWidth(tx: number, ty: number): number {
  const len = Math.hypot(tx, ty) || 1
  const dx = tx / len
  const dy = ty / len
  const d = Math.max(0, -dy)
  const down = d * d * (3 - 2 * d)
  const nib = Math.abs(Math.sin(Math.atan2(dy, dx) - NIB_ANGLE))
  return 0.4 + 0.6 * (0.55 * down + 0.45 * nib)
}

const CDF_BINS = 1024

/**
 * Lookup table s -> u distributing points in proportion to stroke width, so
 * surface density is constant and thick strokes read darker. Advancing s at
 * constant speed slows points in thick strokes and speeds them up in thin
 * ones, preserving that density while flowing.
 */
function buildInverseCdf(index: number): Float32Array {
  const n = STROKE_SEGMENTS[index]
  const tangents = buildStroke(index, 0).computeFrenetFrames(n, false).tangents
  const cumulative = new Float32Array(n + 1)
  for (let j = 1; j <= n; j++) {
    const w0 = penWidth(tangents[j - 1].x, tangents[j - 1].y)
    const w1 = penWidth(tangents[j].x, tangents[j].y)
    cumulative[j] = cumulative[j - 1] + (w0 + w1) / 2
  }
  const total = cumulative[n]
  const inverse = new Float32Array(CDF_BINS + 1)
  let j = 0
  for (let b = 0; b <= CDF_BINS; b++) {
    const target = (b / CDF_BINS) * total
    while (j < n - 1 && cumulative[j + 1] < target) j++
    const span = cumulative[j + 1] - cumulative[j] || 1
    inverse[b] = Math.min(1, (j + (target - cumulative[j]) / span) / n)
  }
  return inverse
}

const INVERSE_CDFS = STROKES.map((_, i) => buildInverseCdf(i))

function sampleInverseCdf(table: Float32Array, s: number): number {
  const f = s * CDF_BINS
  const b = Math.min(Math.floor(f), CDF_BINS - 1)
  return table[b] + (table[b + 1] - table[b]) * (f - b)
}

/** Scale that fits the monogram, tube and morph inside the bounding sphere. */
function strokesFitScale(): number {
  const pts = STROKES.flatMap((_, i) => buildStroke(i, 0).getSpacedPoints(STROKE_SEGMENTS[i]))
  const maxLen = Math.max(...pts.map((p) => p.length()))
  const extent = maxLen + MORPH_AMPLITUDE * 1.8 + TUBE_RADIUS * 1.3
  // The monogram is wider than tall and barely rotates, so the sphere is overly conservative vertically.
  return (SHELL_RADIUS * 1.08) / extent
}

const ribbonVertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aPhase;
  attribute float aFade;
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.5 + 0.5 * sin(uTime * 1.6 + aPhase);
    gl_PointSize = uSize * uScale / -mv.z * (0.75 + 0.5 * twinkle) * mix(0.6, 1.0, aFade);
    vColor = aColor;
    vAlpha = (0.55 + 0.45 * twinkle) * aFade;
  }
`

const ribbonFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vColor, vAlpha * smoothstep(0.5, 0.3, d));
  }
`

/** Deterministic PRNG (mulberry32): same cloud on every render, no Math.random. */
function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIT_SCALE = strokesFitScale()

function createRibbonParticles(count: number) {
  const random = seededRandom(7)
  const particles: RibbonParticle = {
    stroke: new Uint8Array(count),
    u: new Float32Array(count),
    angle: new Float32Array(count),
    radial: new Float32Array(count),
  }
  const colorIndex = new Uint8Array(count)
  const phases = new Float32Array(count)
  const totalLength = STROKE_LENGTHS.reduce((a, b) => a + b, 0)

  for (let i = 0; i < count; i++) {
    // Pick strokes in proportion to their length for uniform density.
    let pick = random() * totalLength
    let stroke = 0
    while (stroke < STROKES.length - 1 && pick > STROKE_LENGTHS[stroke]) {
      pick -= STROKE_LENGTHS[stroke]
      stroke++
    }
    particles.stroke[i] = stroke
    particles.u[i] = random()
    particles.angle[i] = random() * Math.PI * 2
    // Mostly near the tube surface, a few inside.
    particles.radial[i] = 1 - Math.pow(random(), 3) * 0.35
    phases[i] = random() * Math.PI * 2
    colorIndex[i] = Math.floor(random() * RIBBON_PALETTE.length)
  }

  return {
    particles,
    positions: new Float32Array(count * 3),
    colorIndex,
    phases,
    fades: new Float32Array(count).fill(1),
  }
}

function paletteColors(colorIndex: Uint8Array): Float32Array {
  const palette = RIBBON_PALETTE.map((token) => new THREE.Color(themeColor(token)))
  const colors = new Float32Array(colorIndex.length * 3)
  colorIndex.forEach((index, i) => {
    const { r, g, b } = palette[index]
    colors.set([r, g, b], i * 3)
  })
  return colors
}

/** Flow speed along the stroke, in length units per second. */
const FLOW_SPEED = 0.4
/** Fraction of the stroke over which points fade in/out at its ends. */
const FLOW_FADE = 0.015

function ParticleRibbon({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const height = useThree((s) => s.size.height)

  const { particles, positions, colorIndex, phases, fades } = useMemo(
    () => createRibbonParticles(count),
    [count],
  )
  const colors = useMemo(() => paletteColors(colorIndex), [colorIndex])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 0.036 },
      uScale: { value: height / 2 },
    }),
    [height],
  )

  useFrame((state) => {
    const points = pointsRef.current
    const material = materialRef.current
    if (!points || !material) return
    const t = state.clock.elapsedTime
    material.uniforms.uTime.value = t
    const out = points.geometry.attributes.position.array as Float32Array
    const fadeOut = points.geometry.attributes.aFade.array as Float32Array

    const strokes = STROKES.map((_, j) => {
      const curve = buildStroke(j, t)
      return {
        samples: curve.getSpacedPoints(STROKE_SEGMENTS[j]),
        frames: curve.computeFrenetFrames(STROKE_SEGMENTS[j], false),
        segments: STROKE_SEGMENTS[j],
      }
    })
    const swirl = t * 0.25

    for (let i = 0; i < count; i++) {
      const stroke = particles.stroke[i]
      const { samples, frames, segments } = strokes[stroke]
      // Flows from the start of the L to the end of the H, then wraps around.
      const phase = (particles.u[i] + (t * FLOW_SPEED) / STROKE_LENGTHS[stroke]) % 1
      const u = sampleInverseCdf(INVERSE_CDFS[stroke], phase)
      fadeOut[i] = Math.min(1, u / FLOW_FADE, (1 - u) / FLOW_FADE)
      // Interpolate between samples; otherwise points snap into visible rings.
      const f = Math.min(u * segments, segments - 1e-4)
      const i0 = Math.floor(f)
      const i1 = i0 + 1
      const k = f - i0
      const p0 = samples[i0]
      const p1 = samples[i1]
      const n0 = frames.normals[i0]
      const n1 = frames.normals[i1]
      const b0 = frames.binormals[i0]
      const b1 = frames.binormals[i1]
      const tx = frames.tangents[i0].x + (frames.tangents[i1].x - frames.tangents[i0].x) * k
      const ty = frames.tangents[i0].y + (frames.tangents[i1].y - frames.tangents[i0].y) * k
      const r = TUBE_RADIUS * penWidth(tx, ty) * particles.radial[i]
      const angle = particles.angle[i] + swirl
      const c = Math.cos(angle) * r
      const s = Math.sin(angle) * r
      const px = p0.x + (p1.x - p0.x) * k
      const py = p0.y + (p1.y - p0.y) * k
      const pz = p0.z + (p1.z - p0.z) * k
      const nx = n0.x + (n1.x - n0.x) * k
      const ny = n0.y + (n1.y - n0.y) * k
      const nz = n0.z + (n1.z - n0.z) * k
      const bx = b0.x + (b1.x - b0.x) * k
      const by = b0.y + (b1.y - b0.y) * k
      const bz = b0.z + (b1.z - b0.z) * k
      out[i * 3] = (px + nx * c + bx * s) * FIT_SCALE
      out[i * 3 + 1] = (py + ny * c + by * s) * FIT_SCALE
      out[i * 3 + 2] = (pz + nz * c + bz * s) * FIT_SCALE
    }
    points.geometry.attributes.position.needsUpdate = true
    points.geometry.attributes.aFade.needsUpdate = true

    points.rotation.y = Math.sin(t * 0.12) * 0.32 + state.pointer.x * 0.2
    points.rotation.x = Math.sin(t * 0.09) * 0.12 - state.pointer.y * 0.1
    points.rotation.z = Math.sin(t * 0.07) * 0.04
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
        <bufferAttribute attach="attributes-aFade" args={[fades, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={ribbonVertexShader}
        fragmentShader={ribbonFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  )
}

function CameraSetup({ cameraZ }: { cameraZ: number }) {
  const get = useThree((s) => s.get)
  useEffect(() => {
    const camera = get().camera
    camera.position.set(0, 0, cameraZ)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = CAMERA_FOV
      camera.updateProjectionMatrix()
    }
  }, [get, cameraZ])
  return null
}

function Scene({ layout, count, theme }: { layout: OrbLayout; count: number; theme: string }) {
  return (
    <>
      <CameraSetup cameraZ={layout.cameraZ} />
      <group position={layout.position} scale={layout.scale}>
        {/* Remounted on theme change to pick up the new token colors; the seed keeps the cloud identical. */}
        <ParticleRibbon key={theme} count={count} />
      </group>
    </>
  )
}

function orbMask(centerXPercent: number, centerYPercent: number): string {
  return `radial-gradient(ellipse 92% 90% at ${centerXPercent.toFixed(1)}% ${centerYPercent.toFixed(1)}%, #000 60%, transparent 97%)`
}

export default function ParticleOrb() {
  const theme = useTheme()
  const [layout, setLayout] = useState<OrbLayout>(() =>
    layoutForViewport(
      typeof window !== 'undefined' ? window.innerWidth : 1280,
      typeof window !== 'undefined' ? window.innerHeight : 800,
      readNavBottomPx(),
    ),
  )
  const [count] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 6000 : 12000,
  )

  useEffect(() => {
    const fit = () =>
      setLayout(layoutForViewport(window.innerWidth, window.innerHeight, readNavBottomPx()))
    // Mobile toolbars resize the viewport height while scrolling; re-fitting on
    // that would visibly zoom the monogram, so touch devices re-fit on width only.
    const touch = matchMedia('(pointer: coarse)').matches
    let lastWidth = window.innerWidth
    const onResize = () => {
      if (touch && window.innerWidth === lastWidth) return
      lastWidth = window.innerWidth
      fit()
    }
    fit()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const mask = orbMask(layout.maskCenterXPercent, layout.maskCenterYPercent)

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    >
      <Canvas
        className="size-full"
        dpr={[1, 1.5]}
        camera={{
          position: [0, 0, layout.cameraZ],
          fov: CAMERA_FOV,
          near: 0.1,
          far: 20,
        }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        eventSource={typeof document !== 'undefined' ? document.body : undefined}
        eventPrefix="client"
      >
        <Scene layout={layout} count={count} theme={theme} />
      </Canvas>
    </div>
  )
}
