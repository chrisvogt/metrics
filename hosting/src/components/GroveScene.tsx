'use client'

import { useEffect, useRef } from 'react'
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BufferGeometry,
  Float32BufferAttribute,
  LineSegments,
  LineBasicMaterial,
  Points,
  PointsMaterial,
  AdditiveBlending,
  CanvasTexture,
  Vector3,
  Group,
} from 'three'
import type { ChronogroveThemeId } from '@/theme/chronogroveTheme'
import { DEFAULT_THEME } from '@/theme/chronogroveTheme'
import { scenePaletteThree } from '@/theme/scenePalette'

// ── Public types ─────────────────────────────────────────────────────────────

export interface GroveProvider {
  id: string
  alive: boolean
  loading: boolean
}

// ── Seeded pseudo-RNG (mulberry32) ───────────────────────────────────────────

function makeRng(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Radial glow texture (soft orb, created once) ─────────────────────────────

function makeGlowTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0.00, 'rgba(255,255,255,1.00)')
  grad.addColorStop(0.30, 'rgba(255,255,255,0.80)')
  grad.addColorStop(0.65, 'rgba(255,255,255,0.22)')
  grad.addColorStop(1.00, 'rgba(255,255,255,0.00)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}

// ── Tree geometry ─────────────────────────────────────────────────────────────

const PROVIDER_COUNT = 7
const MAX_DEPTH = 4

interface GroveData {
  linePos: Float32Array
  lineCol: Float32Array
  juncPos: Float32Array
  leafPos: Vector3[]    // first PROVIDER_COUNT → provider nodes
  extraPos: Vector3[]   // remaining leaves → decorative
}

function buildGrove(rng: () => number, themeId: ChronogroveThemeId): GroveData {
  const lp: number[] = []
  const lc: number[] = []
  const jp: number[] = []
  const leaves: Vector3[] = []
  const pal = scenePaletteThree(themeId)

  function colorAt(d: number): [number, number, number] {
    const t = Math.min(1, Math.max(0, d / MAX_DEPTH))
    const [dr, dg, db] = pal.branchDeep
    const [tr, tg, tb] = pal.branchTip
    return [dr + (tr - dr) * t, dg + (tg - dg) * t, db + (tb - db) * t]
  }

  function grow(
    sx: number, sy: number, sz: number,
    dx: number, dy: number, dz: number,
    len: number,
    depth: number
  ) {
    const ex = sx + dx * len
    const ey = sy + dy * len
    const ez = sz + dz * len

    lp.push(sx, sy, sz, ex, ey, ez)
    const [r, g, b] = colorAt(depth)
    lc.push(r, g, b, r, g, b)

    if (depth >= MAX_DEPTH) {
      leaves.push(new Vector3(ex, ey, ez))
      return
    }

    jp.push(ex, ey, ez)

    const nChildren = depth === 0 ? 3 : 2
    const spread = 0.30 + rng() * 0.12
    const nLen = len * 0.67

    // perp to direction
    let px = 0, py = 0, pz = 0
    if (Math.abs(dx) < 0.9) { py = -dz; pz = dy } else { px = dz; pz = -dx }
    const pl = Math.hypot(px, py, pz)
    px /= pl; py /= pl; pz /= pl

    // tangent = dir × perp
    const tx = dy * pz - dz * py
    const ty = dz * px - dx * pz
    const tz = dx * py - dy * px

    const baseAz = rng() * Math.PI * 2
    for (let i = 0; i < nChildren; i++) {
      const az = baseAz + (i / nChildren) * Math.PI * 2
      const ca = Math.cos(az), sa = Math.sin(az)
      const rpx = px * ca + tx * sa
      const rpy = py * ca + ty * sa
      const rpz = pz * ca + tz * sa
      const cs = Math.cos(spread), ss = Math.sin(spread)
      const cdx = dx * cs + rpx * ss
      const cdy = dy * cs + rpy * ss
      const cdz = dz * cs + rpz * ss
      const cl = Math.hypot(cdx, cdy, cdz)
      grow(ex, ey, ez, cdx / cl, cdy / cl, cdz / cl, nLen, depth + 1)
    }
  }

  grow(0, -2.0, 0, 0, 1, 0, 1.5, 0)

  // Deterministic provider assignment: sort leaves by azimuth angle
  leaves.sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x))

  return {
    linePos: new Float32Array(lp),
    lineCol: new Float32Array(lc),
    juncPos: new Float32Array(jp),
    leafPos: leaves.slice(0, PROVIDER_COUNT),
    extraPos: leaves.slice(PROVIDER_COUNT),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroveScene({
  className,
  providers = [],
  themeId = DEFAULT_THEME,
}: {
  className?: string
  providers?: GroveProvider[]
  themeId?: ChronogroveThemeId
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const smoothRef = useRef({ x: 0, y: 0 })
  const providersRef = useRef(providers)
  const themeRef = useRef(themeId)
  themeRef.current = themeId

  // Keep ref in sync — does NOT re-run the scene setup effect
  useEffect(() => {
    providersRef.current = providers
  }, [providers])

  // Scene setup — runs exactly once
  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // ── Renderer & camera ─────────────────────────────
    const scene = new Scene()
    const camera = new PerspectiveCamera(52, 1, 0.1, 100)
    camera.position.set(0, 0.8, 5.5)
    camera.lookAt(0, 0.4, 0)

    const renderer = new WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0, 0)
    renderer.domElement.style.cssText = 'width:100%;height:100%'
    el.appendChild(renderer.domElement)

    const setSize = () => {
      const w = el.clientWidth || 280
      renderer.setSize(w, w, false)
    }
    setSize()

    // ── Shared texture ────────────────────────────────
    const glowTex = makeGlowTexture()

    // ── Build tree geometry ───────────────────────────
    const rng = makeRng(0xc4705e77)
    const { linePos, lineCol, juncPos, leafPos, extraPos } = buildGrove(rng, themeId)
    const pal = scenePaletteThree(themeId)
    const [jr, jg, jb] = pal.branchTip

    const grove = new Group()
    scene.add(grove)

    // Branch lines
    const branchGeo = new BufferGeometry()
    branchGeo.setAttribute('position', new Float32BufferAttribute(linePos, 3))
    branchGeo.setAttribute('color', new Float32BufferAttribute(lineCol, 3))
    grove.add(new LineSegments(branchGeo, new LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.88,
    })))

    // Junction marker dots (small, deep midnight-blue)
    if (juncPos.length > 0) {
      const n = juncPos.length / 3
      const jCols = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) {
        jCols[i * 3] = jr * 0.42
        jCols[i * 3 + 1] = jg * 0.42
        jCols[i * 3 + 2] = jb * 0.42
      }
      const jGeo = new BufferGeometry()
      jGeo.setAttribute('position', new Float32BufferAttribute(juncPos, 3))
      jGeo.setAttribute('color', new Float32BufferAttribute(jCols, 3))
      grove.add(new Points(jGeo, new PointsMaterial({
        map: glowTex, size: 0.11, vertexColors: true,
        transparent: true, opacity: 0.65,
        blending: AdditiveBlending, depthWrite: false,
      })))
    }

    // ── Provider node orbs (core + halo) ──────────────
    const provCount = Math.min(PROVIDER_COUNT, leafPos.length)

    // Position array (shared by core and halo)
    const provPosArr = new Float32Array(provCount * 3)
    for (let i = 0; i < provCount; i++) {
      const p = leafPos[i]!
      provPosArr[i * 3] = p.x
      provPosArr[i * 3 + 1] = p.y
      provPosArr[i * 3 + 2] = p.z
    }

    // Core orb (solid, medium-sized)
    const provCoreColors = new Float32Array(provCount * 3)
    const provCoreAttr = new Float32BufferAttribute(provCoreColors, 3)
    const provCoreGeo = new BufferGeometry()
    provCoreGeo.setAttribute('position', new Float32BufferAttribute(provPosArr, 3))
    provCoreGeo.setAttribute('color', provCoreAttr)
    grove.add(new Points(provCoreGeo, new PointsMaterial({
      map: glowTex, size: 0.20, vertexColors: true,
      transparent: true, opacity: 0.95,
      blending: AdditiveBlending, depthWrite: false,
    })))

    // Halo (larger, dimmer glow around each node)
    const provHaloColors = new Float32Array(provCount * 3)
    const provHaloAttr = new Float32BufferAttribute(provHaloColors, 3)
    const provHaloGeo = new BufferGeometry()
    provHaloGeo.setAttribute('position', new Float32BufferAttribute(provPosArr, 3))
    provHaloGeo.setAttribute('color', provHaloAttr)
    grove.add(new Points(provHaloGeo, new PointsMaterial({
      map: glowTex, size: 0.60, vertexColors: true,
      transparent: true, opacity: 0.28,
      blending: AdditiveBlending, depthWrite: false,
    })))

    // ── Decorative non-provider leaf nodes (dim cobalt) ──
    if (extraPos.length > 0) {
      const [tr, tg, tb] = pal.branchTip
      const eArr = new Float32Array(extraPos.length * 3)
      const eCols = new Float32Array(extraPos.length * 3)
      for (let i = 0; i < extraPos.length; i++) {
        const p = extraPos[i]!
        eArr[i * 3] = p.x; eArr[i * 3 + 1] = p.y; eArr[i * 3 + 2] = p.z
        eCols[i * 3] = tr * 0.7
        eCols[i * 3 + 1] = tg * 0.7
        eCols[i * 3 + 2] = tb * 0.7
      }
      const eGeo = new BufferGeometry()
      eGeo.setAttribute('position', new Float32BufferAttribute(eArr, 3))
      eGeo.setAttribute('color', new Float32BufferAttribute(eCols, 3))
      grove.add(new Points(eGeo, new PointsMaterial({
        map: glowTex, size: 0.10, vertexColors: true,
        transparent: true, opacity: 0.55,
        blending: AdditiveBlending, depthWrite: false,
      })))
    }

    // ── Ambient spores ────────────────────────────────
    const SPORE_N = 300
    const sporePosArr = new Float32Array(SPORE_N * 3)
    const sporeVel = new Float32Array(SPORE_N)
    for (let i = 0; i < SPORE_N; i++) {
      sporePosArr[i * 3]     = (rng() - 0.5) * 5.5
      sporePosArr[i * 3 + 1] = (rng() - 0.5) * 7.0
      sporePosArr[i * 3 + 2] = (rng() - 0.5) * 3.0
      sporeVel[i] = 0.40 + rng() * 0.50  // units per second
    }
    const sporeGeo = new BufferGeometry()
    const sporePosAttr = new Float32BufferAttribute(sporePosArr, 3)
    sporeGeo.setAttribute('position', sporePosAttr)
    grove.add(new Points(sporeGeo, new PointsMaterial({
      map: glowTex,
      size: 0.052,
      color: pal.spore,
      transparent: true,
      opacity: 0.40,
      blending: AdditiveBlending,
      depthWrite: false,
    })))

    // ── Resize observer ───────────────────────────────
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(setSize) : null
    ro?.observe(el)

    // ── Mouse parallax ────────────────────────────────
    const handleMouse = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      mouseRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    }
    window.addEventListener('mousemove', handleMouse)

    // ── Render loop ───────────────────────────────────
    let raf = 0
    const startTime = performance.now()
    let lastFrame = startTime

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const now = performance.now()
      const elapsed = (now - startTime) / 1000   // seconds since mount
      const dt = Math.min((now - lastFrame) / 1000, 0.05)
      lastFrame = now

      // Tree rotation & gentle sway
      grove.rotation.y = elapsed * 0.22
      grove.rotation.z = Math.sin(elapsed * 0.30) * 0.022

      // Smooth mouse tilt
      smoothRef.current.x += (mouseRef.current.x - smoothRef.current.x) * 0.04
      smoothRef.current.y += (mouseRef.current.y - smoothRef.current.y) * 0.04
      grove.rotation.x  = smoothRef.current.y * 0.10
      grove.rotation.y += smoothRef.current.x * 0.05

      // ── Provider node colors ───────────────────────
      const provs = providersRef.current
      for (let i = 0; i < provCount; i++) {
        const prov = provs[i]
        const b = i * 3
        let cr: number, cg: number, cb: number

        if (!prov || prov.loading) {
          // Loading: muted grey-blue, 2.5 Hz breathing
          const pulse = 0.28 + 0.14 * Math.sin(elapsed * Math.PI * 2 * 2.5 + i * 0.7)
          cr = pulse * 0.42; cg = pulse * 0.55; cb = pulse * 0.78

        } else if (prov.alive) {
          const [ar, ag, ab] = scenePaletteThree(themeRef.current).alive
          const pulse = 0.80 + 0.20 * Math.sin(elapsed * Math.PI * 2 * 0.7 + i * 0.85)
          cr = ar * pulse; cg = ag * pulse; cb = ab * pulse

        } else {
          // Dead: dark village-brown, 0.25 Hz slow flicker
          const flicker = 0.42 + 0.08 * Math.sin(elapsed * Math.PI * 2 * 0.25 + i * 1.2)
          cr = 0.42 * flicker; cg = 0.22 * flicker; cb = 0.10 * flicker
        }

        provCoreColors[b]     = cr
        provCoreColors[b + 1] = cg
        provCoreColors[b + 2] = cb
        provHaloColors[b]     = cr * 0.38
        provHaloColors[b + 1] = cg * 0.38
        provHaloColors[b + 2] = cb * 0.38
      }
      provCoreAttr.needsUpdate = true
      provHaloAttr.needsUpdate = true

      // ── Drift spores upward ────────────────────────
      const sArr = sporePosAttr.array as Float32Array
      for (let i = 0; i < SPORE_N; i++) {
        const y1 = i * 3 + 1
        sArr[y1] = (sArr[y1] ?? 0) + (sporeVel[i] ?? 0) * dt
        if ((sArr[y1] ?? 0) > 4.2) {
          sArr[y1] = -3.5
          sArr[i * 3]     = (rng() - 0.5) * 5.5
          sArr[i * 3 + 2] = (rng() - 0.5) * 3.0
        }
      }
      sporePosAttr.needsUpdate = true

      renderer.render(scene, camera)
    }

    if (prefersReduced) {
      renderer.render(scene, camera)
    } else {
      raf = requestAnimationFrame(animate)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('mousemove', handleMouse)
      glowTex.dispose()
      renderer.dispose()
      renderer.domElement.parentElement?.removeChild(renderer.domElement)
    }
  }, [themeId])

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: '100%', aspectRatio: '1' }}
    />
  )
}
