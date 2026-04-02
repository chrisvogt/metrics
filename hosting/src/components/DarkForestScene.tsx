'use client'

import { useEffect, useRef } from 'react'
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  FogExp2,
  Group,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  LineSegments,
  LineBasicMaterial,
  AdditiveBlending,
  CanvasTexture,
} from 'three'

const VOID = 0x080b16
const FOG_COL = 0x060912
const GRID_COL = 0x0c1525
const STAR_COL = 0xc0d4ee
const COL_ROOT = new Color(0x4a6a8a)
const COL_TIP = new Color(0xd4a054)
const COL_JUNC = new Color(0x7bc4a8)
const COL_SPORE = 0xd4a054

const MAX_DEPTH = 8
const GLOW_PER_SEG = 8
const SPORE_N = 200
const STAR_N = 2500
const BRIGHT_N = 80

interface Seg {
  sx: number; sy: number; sz: number
  ex: number; ey: number; ez: number
  depth: number
  birth: number
  dur: number
  terminal: boolean
}

function rng32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeGlow(size = 64): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(220,235,255,1)')
  g.addColorStop(0.12, 'rgba(130,180,240,0.6)')
  g.addColorStop(0.4, 'rgba(50,90,160,0.12)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const t = new CanvasTexture(c)
  t.needsUpdate = true
  return t
}

function growTree(rng: () => number): Seg[] {
  const segs: Seg[] = []
  const UP = new Vector3(0, 1, 0)
  const RIGHT = new Vector3(1, 0, 0)

  function branch(
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
    len: number, depth: number, pBirth: number,
  ) {
    if (depth > MAX_DEPTH) return

    const ex = ox + dx * len
    const ey = oy + dy * len
    const ez = oz + dz * len
    const birth = depth === 0 ? 0 : pBirth + 1.0 + rng() * 0.8
    const dur = Math.max(0.4, 2.0 - depth * 0.15 + (rng() - 0.5) * 0.2)
    const terminal = depth >= MAX_DEPTH || (depth >= 6 && rng() < 0.25)

    segs.push({ sx: ox, sy: oy, sz: oz, ex, ey, ez, depth, birth, dur, terminal })
    if (terminal) return

    const nKids = depth === 0 ? 4 : depth < 3 ? (rng() < 0.45 ? 3 : 2) : 2
    const dir = new Vector3(dx, dy, dz)
    const perp = new Vector3()
    if (Math.abs(dy) < 0.9) perp.crossVectors(dir, UP).normalize()
    else perp.crossVectors(dir, RIGHT).normalize()

    for (let c = 0; c < nKids; c++) {
      const isCont = c === 0 && depth < 2
      const spread = isCont
        ? 0.1 + rng() * 0.12
        : 0.28 + rng() * 0.32 + depth * 0.02

      const cDir = dir.clone().applyAxisAngle(perp, spread)
      const phi = (c / nKids) * Math.PI * 2 + (rng() - 0.5) * 0.7
      cDir.applyAxisAngle(dir, phi)
      cDir.y += 0.06 * (1 - depth / MAX_DEPTH)
      cDir.normalize()

      const cLen = len * (isCont ? 0.72 + rng() * 0.1 : 0.55 + rng() * 0.16)
      branch(ex, ey, ez, cDir.x, cDir.y, cDir.z, cLen, depth + 1, birth)
    }
  }

  const d = new Vector3(0.02, 1, 0.01).normalize()
  branch(0, -5, 0, d.x, d.y, d.z, 14.0, 0, 0)
  return segs
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

export default function DarkForestScene({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const smoothRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rng = rng32(0xce0514d3)

    const scene = new Scene()
    scene.background = new Color(VOID)
    scene.fog = new FogExp2(FOG_COL, 0.014)

    const camera = new PerspectiveCamera(75, 1, 0.1, 200)
    camera.position.set(0.3, -3, 1)

    const renderer = new WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'
    el.appendChild(renderer.domElement)

    const world = new Group()
    scene.add(world)
    const glowTex = makeGlow(64)

    // ── Stars ──────────────────────────────────────────────────────
    const starPos = new Float32Array(STAR_N * 3)
    for (let i = 0; i < STAR_N; i++) {
      const r = 40 + rng() * 60
      const u = rng() * Math.PI * 2
      const v = Math.acos(2 * rng() - 1)
      starPos[i * 3] = r * Math.sin(v) * Math.cos(u)
      starPos[i * 3 + 1] = r * Math.sin(v) * Math.sin(u)
      starPos[i * 3 + 2] = r * Math.cos(v)
    }
    const starGeo = new BufferGeometry()
    starGeo.setAttribute('position', new Float32BufferAttribute(starPos, 3))
    world.add(
      new Points(
        starGeo,
        new PointsMaterial({
          color: STAR_COL,
          size: 0.04,
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
        }),
      ),
    )

    const bStarPos = new Float32Array(BRIGHT_N * 3)
    for (let i = 0; i < BRIGHT_N; i++) {
      const r = 35 + rng() * 55
      const u = rng() * Math.PI * 2
      const v = Math.acos(2 * rng() - 1)
      bStarPos[i * 3] = r * Math.sin(v) * Math.cos(u)
      bStarPos[i * 3 + 1] = r * Math.sin(v) * Math.sin(u)
      bStarPos[i * 3 + 2] = r * Math.cos(v)
    }
    const bStarGeo = new BufferGeometry()
    bStarGeo.setAttribute('position', new Float32BufferAttribute(bStarPos, 3))
    world.add(
      new Points(
        bStarGeo,
        new PointsMaterial({
          color: 0xe0eaff,
          size: 0.07,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      ),
    )

    const NEB_N = 14
    const nebPos = new Float32Array(NEB_N * 3)
    for (let i = 0; i < NEB_N; i++) {
      const r = 18 + rng() * 30
      const u = rng() * Math.PI * 2
      const v = Math.acos(2 * rng() - 1)
      nebPos[i * 3] = r * Math.sin(v) * Math.cos(u)
      nebPos[i * 3 + 1] = r * Math.sin(v) * Math.sin(u)
      nebPos[i * 3 + 2] = r * Math.cos(v)
    }
    const nebGeo = new BufferGeometry()
    nebGeo.setAttribute('position', new Float32BufferAttribute(nebPos, 3))
    world.add(
      new Points(
        nebGeo,
        new PointsMaterial({
          map: glowTex,
          color: 0x1a2545,
          size: 8,
          transparent: true,
          opacity: 0.05,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      ),
    )

    // ── Perspective grid ───────────────────────────────────────────
    const GY = -5.5
    const gv: number[] = []
    const GSPAN = 50, GFAR = -80, GNEAR = 12, GSTEP = 3.0
    for (let x = -GSPAN; x <= GSPAN; x += GSTEP) gv.push(x, GY, GNEAR, x, GY, GFAR)
    for (let z = GFAR; z <= GNEAR; z += GSTEP) gv.push(-GSPAN, GY, z, GSPAN, GY, z)
    const gridGeo = new BufferGeometry()
    gridGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(gv), 3))
    world.add(
      new LineSegments(
        gridGeo,
        new LineBasicMaterial({
          color: GRID_COL,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        }),
      ),
    )

    // ── Ambient glows ──────────────────────────────────────────────
    const rootGlowGeo = new BufferGeometry()
    rootGlowGeo.setAttribute(
      'position',
      new Float32BufferAttribute(new Float32Array([0, -5, 0]), 3),
    )
    world.add(
      new Points(
        rootGlowGeo,
        new PointsMaterial({
          map: glowTex,
          color: 0x4a6a8a,
          size: 6,
          transparent: true,
          opacity: 0.06,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      ),
    )

    const canopyGlowGeo = new BufferGeometry()
    canopyGlowGeo.setAttribute(
      'position',
      new Float32BufferAttribute(new Float32Array([0, 15, 0]), 3),
    )
    world.add(
      new Points(
        canopyGlowGeo,
        new PointsMaterial({
          map: glowTex,
          color: 0x2a3a50,
          size: 22,
          transparent: true,
          opacity: 0.035,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      ),
    )

    // ── Tree generation ────────────────────────────────────────────
    const segs = growTree(rng)
    const N = segs.length
    const terms: number[] = []
    for (let i = 0; i < N; i++) if (segs[i]!.terminal) terms.push(i)

    const tmpCol = new Color()

    // ── Core branch lines ──────────────────────────────────────────
    const coreV = new Float32Array(N * 6)
    const coreC = new Float32Array(N * 6)
    for (let i = 0; i < N; i++) {
      const s = segs[i]!
      const t = Math.min(1, s.depth / MAX_DEPTH)
      tmpCol.copy(COL_ROOT).lerp(COL_TIP, t * 0.65)
      coreC[i * 6] = tmpCol.r
      coreC[i * 6 + 1] = tmpCol.g
      coreC[i * 6 + 2] = tmpCol.b
      tmpCol.copy(COL_ROOT).lerp(COL_TIP, Math.min(1, t * 0.65 + 0.15))
      coreC[i * 6 + 3] = tmpCol.r
      coreC[i * 6 + 4] = tmpCol.g
      coreC[i * 6 + 5] = tmpCol.b
      coreV[i * 6] = s.sx
      coreV[i * 6 + 1] = s.sy
      coreV[i * 6 + 2] = s.sz
      coreV[i * 6 + 3] = s.sx
      coreV[i * 6 + 4] = s.sy
      coreV[i * 6 + 5] = s.sz
    }
    const coreGeo = new BufferGeometry()
    coreGeo.setAttribute('position', new Float32BufferAttribute(coreV, 3))
    coreGeo.setAttribute('color', new Float32BufferAttribute(coreC, 3))
    world.add(
      new LineSegments(
        coreGeo,
        new LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
        }),
      ),
    )

    // ── Glow line pass (additive haze) ─────────────────────────────
    const glV = new Float32Array(N * 6)
    const glC = new Float32Array(N * 6)
    for (let i = 0; i < N; i++) {
      const s = segs[i]!
      const t = Math.min(1, s.depth / MAX_DEPTH)
      tmpCol.copy(COL_ROOT).lerp(COL_TIP, t * 0.5).multiplyScalar(1.4)
      glC[i * 6] = tmpCol.r
      glC[i * 6 + 1] = tmpCol.g
      glC[i * 6 + 2] = tmpCol.b
      glC[i * 6 + 3] = tmpCol.r
      glC[i * 6 + 4] = tmpCol.g
      glC[i * 6 + 5] = tmpCol.b
      glV[i * 6] = s.sx
      glV[i * 6 + 1] = s.sy
      glV[i * 6 + 2] = s.sz
      glV[i * 6 + 3] = s.sx
      glV[i * 6 + 4] = s.sy
      glV[i * 6 + 5] = s.sz
    }
    const glGeo = new BufferGeometry()
    glGeo.setAttribute('position', new Float32BufferAttribute(glV, 3))
    glGeo.setAttribute('color', new Float32BufferAttribute(glC, 3))
    world.add(
      new LineSegments(
        glGeo,
        new LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      ),
    )

    // ── Volumetric glow points ─────────────────────────────────────
    const gpN = N * GLOW_PER_SEG
    const gpPos = new Float32Array(gpN * 3)
    const gpFin = new Float32Array(gpN * 3)
    const gpC = new Float32Array(gpN * 3)
    for (let i = 0; i < N; i++) {
      const s = segs[i]!
      const t = Math.min(1, s.depth / MAX_DEPTH)
      for (let j = 0; j < GLOW_PER_SEG; j++) {
        const f = (j + 0.5) / GLOW_PER_SEG
        const idx = (i * GLOW_PER_SEG + j) * 3
        gpFin[idx] = s.sx + (s.ex - s.sx) * f
        gpFin[idx + 1] = s.sy + (s.ey - s.sy) * f
        gpFin[idx + 2] = s.sz + (s.ez - s.sz) * f
        tmpCol.copy(COL_ROOT).lerp(COL_TIP, Math.min(1, t * 0.6 + f * 0.2))
        gpC[idx] = tmpCol.r
        gpC[idx + 1] = tmpCol.g
        gpC[idx + 2] = tmpCol.b
        gpPos[idx] = s.sx
        gpPos[idx + 1] = s.sy
        gpPos[idx + 2] = s.sz
      }
    }
    const gpAttr = new Float32BufferAttribute(gpPos, 3)
    const gpGeo = new BufferGeometry()
    gpGeo.setAttribute('position', gpAttr)
    gpGeo.setAttribute('color', new Float32BufferAttribute(gpC, 3))
    world.add(
      new Points(
        gpGeo,
        new PointsMaterial({
          map: glowTex,
          size: 0.4,
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
          blending: AdditiveBlending,
          vertexColors: true,
        }),
      ),
    )
    const gpGeo2 = new BufferGeometry()
    gpGeo2.setAttribute('position', gpAttr)
    gpGeo2.setAttribute('color', new Float32BufferAttribute(gpC.slice(), 3))
    world.add(
      new Points(
        gpGeo2,
        new PointsMaterial({
          map: glowTex,
          size: 1.2,
          transparent: true,
          opacity: 0.05,
          depthWrite: false,
          blending: AdditiveBlending,
          vertexColors: true,
        }),
      ),
    )

    // ── Junction nodes (teal accent) ───────────────────────────────
    const juncMap = new Map<string, { x: number; y: number; z: number; birth: number }>()
    for (let i = 0; i < N; i++) {
      const s = segs[i]!
      if (s.depth === 0) continue
      const k = `${s.sx.toFixed(3)},${s.sy.toFixed(3)},${s.sz.toFixed(3)}`
      const existing = juncMap.get(k)
      if (!existing || s.birth < existing.birth)
        juncMap.set(k, { x: s.sx, y: s.sy, z: s.sz, birth: s.birth })
    }
    const juncs = Array.from(juncMap.values())
    const JN = juncs.length
    const jPos = new Float32Array(JN * 3)
    const jBirth = new Float32Array(JN)
    for (let i = 0; i < JN; i++) {
      const j = juncs[i]!
      jPos[i * 3] = j.x
      jPos[i * 3 + 1] = -200
      jPos[i * 3 + 2] = j.z
      jBirth[i] = j.birth
    }
    const jAttr = new Float32BufferAttribute(jPos, 3)
    const jGeo = new BufferGeometry()
    jGeo.setAttribute('position', jAttr)
    world.add(
      new Points(
        jGeo,
        new PointsMaterial({
          map: glowTex,
          color: COL_JUNC,
          size: 0.55,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      ),
    )
    const jGeo2 = new BufferGeometry()
    jGeo2.setAttribute('position', jAttr)
    world.add(
      new Points(
        jGeo2,
        new PointsMaterial({
          map: glowTex,
          color: COL_JUNC,
          size: 1.8,
          transparent: true,
          opacity: 0.1,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      ),
    )

    // ── Spore particles ────────────────────────────────────────────
    const spX = new Float32Array(SPORE_N)
    const spY = new Float32Array(SPORE_N)
    const spZ = new Float32Array(SPORE_N)
    const spVx = new Float32Array(SPORE_N)
    const spVy = new Float32Array(SPORE_N)
    const spVz = new Float32Array(SPORE_N)
    const spLife = new Float32Array(SPORE_N)
    const spMax = new Float32Array(SPORE_N)
    const spOn = new Uint8Array(SPORE_N)
    const spPos = new Float32Array(SPORE_N * 3)
    const spCol = new Float32Array(SPORE_N * 3)
    for (let i = 0; i < SPORE_N; i++) {
      spPos[i * 3 + 1] = -200
      spMax[i] = 2.5 + rng() * 2
    }
    const spGeo = new BufferGeometry()
    spGeo.setAttribute('position', new Float32BufferAttribute(spPos, 3))
    spGeo.setAttribute('color', new Float32BufferAttribute(spCol, 3))
    world.add(
      new Points(
        spGeo,
        new PointsMaterial({
          map: glowTex,
          color: COL_SPORE,
          size: 0.15,
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
          blending: AdditiveBlending,
          vertexColors: true,
        }),
      ),
    )

    let spTimer = 0

    function spawnSpore(idx: number, now: number) {
      if (terms.length === 0) return
      for (let a = 0; a < 5; a++) {
        const si = terms[Math.floor(rng() * terms.length)]!
        const seg = segs[si]!
        const raw = now < seg.birth ? 0 : Math.min(1, (now - seg.birth) / seg.dur)
        if (raw < 0.7) continue
        const p = easeOut(raw)
        spX[idx] = seg.sx + (seg.ex - seg.sx) * p + (rng() - 0.5) * 0.3
        spY[idx] = seg.sy + (seg.ey - seg.sy) * p + (rng() - 0.5) * 0.3
        spZ[idx] = seg.sz + (seg.ez - seg.sz) * p + (rng() - 0.5) * 0.3
        spVx[idx] = (rng() - 0.5) * 0.3
        spVy[idx] = 0.4 + rng() * 0.5
        spVz[idx] = (rng() - 0.5) * 0.3
        spLife[idx] = 0
        spMax[idx] = 3.0 + rng() * 2.5
        spOn[idx] = 1
        return
      }
    }

    // ── Resize + events ────────────────────────────────────────────
    const resize = () => {
      const w = el.clientWidth || 300
      const h = el.clientHeight || 400
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    const onMouse = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - r.left) / r.width - 0.5) * 2
      mouseRef.current.y = ((e.clientY - r.top) / r.height - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouse)

    // ── Animate ────────────────────────────────────────────────────
    let raf = 0
    const t0 = performance.now()
    let prevT = -1

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const now = (performance.now() - t0) / 1000
      const dt = prevT < 0 ? 0.016 : Math.min(0.05, now - prevT)
      prevT = now

      smoothRef.current.x += (mouseRef.current.x - smoothRef.current.x) * 0.04
      smoothRef.current.y += (mouseRef.current.y - smoothRef.current.y) * 0.04
      const mx = smoothRef.current.x
      const my = smoothRef.current.y

      camera.position.x = 0.3 + mx * 0.8
      camera.position.y = -3 - my * 0.5
      camera.lookAt(mx * 0.2, 12 + my * 0.15, 0)

      // Branch growth
      for (let i = 0; i < N; i++) {
        const s = segs[i]!
        const raw = now < s.birth ? 0 : Math.min(1, (now - s.birth) / s.dur)
        const p = easeOut(raw)

        const cx = s.sx + (s.ex - s.sx) * p
        const cy = s.sy + (s.ey - s.sy) * p
        const cz = s.sz + (s.ez - s.sz) * p

        coreV[i * 6] = s.sx
        coreV[i * 6 + 1] = s.sy
        coreV[i * 6 + 2] = s.sz
        coreV[i * 6 + 3] = cx
        coreV[i * 6 + 4] = cy
        coreV[i * 6 + 5] = cz

        glV[i * 6] = s.sx
        glV[i * 6 + 1] = s.sy
        glV[i * 6 + 2] = s.sz
        glV[i * 6 + 3] = cx
        glV[i * 6 + 4] = cy
        glV[i * 6 + 5] = cz

        for (let j = 0; j < GLOW_PER_SEG; j++) {
          const f = (j + 0.5) / GLOW_PER_SEG
          const gi = (i * GLOW_PER_SEG + j) * 3
          if (f <= p) {
            gpPos[gi] = gpFin[gi]!
            gpPos[gi + 1] = gpFin[gi + 1]!
            gpPos[gi + 2] = gpFin[gi + 2]!
          } else {
            gpPos[gi] = cx
            gpPos[gi + 1] = cy
            gpPos[gi + 2] = cz
          }
        }
      }
      coreGeo.getAttribute('position')!.needsUpdate = true
      glGeo.getAttribute('position')!.needsUpdate = true
      gpAttr.needsUpdate = true

      // Junction reveal
      for (let i = 0; i < JN; i++) {
        if (now >= jBirth[i]!) {
          const j = juncs[i]!
          jPos[i * 3] = j.x
          jPos[i * 3 + 1] = j.y
          jPos[i * 3 + 2] = j.z
        }
      }
      jAttr.needsUpdate = true

      // Spore spawning + physics
      if (now > 4) {
        spTimer += dt
        while (spTimer >= 0.025) {
          spTimer -= 0.025
          for (let i = 0; i < SPORE_N; i++) {
            if (!spOn[i]) {
              spawnSpore(i, now)
              break
            }
          }
        }
      }

      for (let i = 0; i < SPORE_N; i++) {
        if (!spOn[i]) continue
        const life = (spLife[i] = spLife[i]! + dt)
        if (life >= spMax[i]!) {
          spOn[i] = 0
          spPos[i * 3 + 1] = -200
          spCol[i * 3] = spCol[i * 3 + 1] = spCol[i * 3 + 2] = 0
          continue
        }
        const fade = 1 - life / spMax[i]!
        const b = fade * fade
        spCol[i * 3] = b
        spCol[i * 3 + 1] = b
        spCol[i * 3 + 2] = b

        let vx = spVx[i]! + Math.sin(now * 2.3 + i * 0.7) * 0.02
        let vz = spVz[i]! + Math.cos(now * 1.8 + i * 0.9) * 0.02
        vx *= 0.98
        vz *= 0.98
        spVx[i] = vx
        spVz[i] = vz

        const px = (spX[i] = spX[i]! + vx * dt)
        const py = (spY[i] = spY[i]! + spVy[i]! * dt)
        const pz = (spZ[i] = spZ[i]! + vz * dt)

        spPos[i * 3] = px
        spPos[i * 3 + 1] = py
        spPos[i * 3 + 2] = pz
      }
      spGeo.getAttribute('position')!.needsUpdate = true
      spGeo.getAttribute('color')!.needsUpdate = true

      world.rotation.y = now * 0.003 + mx * 0.01

      renderer.render(scene, camera)
    }

    // ── Reduced motion: single static frame ────────────────────────
    if (reduced) {
      for (let i = 0; i < N; i++) {
        const s = segs[i]!
        coreV[i * 6] = s.sx
        coreV[i * 6 + 1] = s.sy
        coreV[i * 6 + 2] = s.sz
        coreV[i * 6 + 3] = s.ex
        coreV[i * 6 + 4] = s.ey
        coreV[i * 6 + 5] = s.ez
        glV[i * 6] = s.sx
        glV[i * 6 + 1] = s.sy
        glV[i * 6 + 2] = s.sz
        glV[i * 6 + 3] = s.ex
        glV[i * 6 + 4] = s.ey
        glV[i * 6 + 5] = s.ez
        for (let j = 0; j < GLOW_PER_SEG; j++) {
          const gi = (i * GLOW_PER_SEG + j) * 3
          gpPos[gi] = gpFin[gi]!
          gpPos[gi + 1] = gpFin[gi + 1]!
          gpPos[gi + 2] = gpFin[gi + 2]!
        }
      }
      for (let i = 0; i < JN; i++) {
        const j = juncs[i]!
        jPos[i * 3] = j.x
        jPos[i * 3 + 1] = j.y
        jPos[i * 3 + 2] = j.z
      }
      coreGeo.getAttribute('position')!.needsUpdate = true
      glGeo.getAttribute('position')!.needsUpdate = true
      gpAttr.needsUpdate = true
      jAttr.needsUpdate = true
      camera.lookAt(0, 12, 0)
      renderer.render(scene, camera)
    } else {
      raf = requestAnimationFrame(animate)
    }

    // ── Cleanup ────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('mousemove', onMouse)
      glowTex.dispose()
      const disposed = new Set<BufferGeometry>()
      scene.traverse((obj) => {
        if (obj instanceof Points || obj instanceof LineSegments) {
          if (!disposed.has(obj.geometry)) {
            disposed.add(obj.geometry)
            obj.geometry.dispose()
          }
          const m = obj.material
          if (Array.isArray(m)) m.forEach((mat) => mat.dispose())
          else m.dispose()
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100%' }} />
}
