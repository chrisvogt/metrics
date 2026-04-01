'use client'

import { useEffect, useRef } from 'react'
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  FogExp2,
  Group,
  CatmullRomCurve3,
  TubeGeometry,
  Mesh,
  MeshBasicMaterial,
  Vector3,
  PlaneGeometry,
  DoubleSide,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  AdditiveBlending,
  CanvasTexture,
  LineSegments,
} from 'three'

function makeGlowTexture(size = 64): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(200,240,220,1)')
  g.addColorStop(0.25, 'rgba(120,200,170,0.35)')
  g.addColorStop(0.55, 'rgba(60,120,90,0.08)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(c)
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Layered vascular tubes + canopy planes — Dark Forest login backdrop. */
export default function DarkForestScene({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const smoothRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rng = mulberry32(0x9e3779b9)

    const scene = new Scene()
    scene.background = new Color(0x050806)
    scene.fog = new FogExp2(0x030504, 0.052)

    const camera = new PerspectiveCamera(52, 1, 0.08, 120)
    camera.position.set(0, 0.35, 5.2)

    const renderer = new WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'
    el.appendChild(renderer.domElement)

    const world = new Group()
    scene.add(world)

    // ── Distant canopy layers (silhouette mass, not literal trees) ──
    const canopyGroup = new Group()
    world.add(canopyGroup)
    for (let i = 0; i < 4; i++) {
      const w = 42 + i * 6
      const h = 18 + i * 3
      const geo = new PlaneGeometry(w, h, 1, 1)
      const mat = new MeshBasicMaterial({
        color: new Color().setRGB(0.012 + i * 0.004, 0.02 + i * 0.006, 0.016 + i * 0.005),
        transparent: true,
        opacity: 0.88 - i * 0.14,
        side: DoubleSide,
        depthWrite: true,
      })
      const mesh = new Mesh(geo, mat)
      const z = -8.5 - i * 4.2
      mesh.position.set((rng() - 0.5) * 1.2, 0.35 + i * 0.15, z)
      mesh.rotation.x = -Math.PI / 2 - 0.08 - rng() * 0.05
      mesh.rotation.z = (rng() - 0.5) * 0.12
      canopyGroup.add(mesh)
    }

    // ── Vascular tubes (few, thick fog falloff) ──
    interface TubeObj {
      mesh: Mesh
      baseOp: number
      phase: number
    }
    const tubes: TubeObj[] = []

    function addVessel(points: Vector3[], radius: number, hueShift: number) {
      if (points.length < 4) return
      const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.35)
      const geom = new TubeGeometry(curve, 96, radius, 6, false)
      const baseOp = 0.22 + hueShift * 0.08
      const mat = new MeshBasicMaterial({
        color: new Color().setHSL(0.38 + hueShift * 0.04, 0.45, 0.42),
        transparent: true,
        opacity: baseOp,
        depthWrite: false,
      })
      const mesh = new Mesh(geom, mat)
      world.add(mesh)
      tubes.push({ mesh, baseOp, phase: rng() * Math.PI * 2 })
    }

    const trunkPath = [
      new Vector3(0, -2.2, 0),
      new Vector3(0.1, -0.4, 0.05),
      new Vector3(-0.2, 0.9, 0.15),
      new Vector3(0.15, 1.5, -0.1),
      new Vector3(-0.35, 2.1, 0.2),
    ]
    addVessel(trunkPath, 0.028, 0)

    for (let b = 0; b < 6; b++) {
      const ax = (rng() - 0.5) * 2.4
      const ay = 0.2 + rng() * 1.8
      const az = (rng() - 0.5) * 1.4
      const spread = 0.8 + rng() * 0.6
      const pts: Vector3[] = [
        new Vector3(ax * 0.2, ay * 0.3 + 0.2, az * 0.15),
        new Vector3(ax * 0.45, ay * 0.75, az * 0.4),
        new Vector3(ax * 0.85, ay + spread * 0.35, az * 0.75),
        new Vector3(ax * 1.15, ay + spread * 0.75, az * 0.95 + (rng() - 0.5) * 0.5),
        new Vector3(ax * 1.35 + (rng() - 0.5) * 0.4, ay + spread * 1.05, az * 1.1),
      ]
      addVessel(pts, 0.014 + rng() * 0.008, 0.2 + rng() * 0.8)
    }

    // ── Sparse bioluminescent motes ──
    const glowTex = makeGlowTexture(64)
    const MOTE_N = 420
    const mPos = new Float32Array(MOTE_N * 3)
    const mVel = new Float32Array(MOTE_N)
    for (let i = 0; i < MOTE_N; i++) {
      mPos[i * 3] = (rng() - 0.5) * 14
      mPos[i * 3 + 1] = (rng() - 0.5) * 10
      mPos[i * 3 + 2] = (rng() - 0.5) * 8
      mVel[i] = 0.15 + rng() * 0.35
    }
    const mGeo = new BufferGeometry()
    const mAttr = new Float32BufferAttribute(mPos, 3)
    mGeo.setAttribute('position', mAttr)
    const motes = new Points(
      mGeo,
      new PointsMaterial({
        map: glowTex,
        color: 0x7bc4a8,
        size: 0.045,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: AdditiveBlending,
      })
    )
    world.add(motes)

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

    let raf = 0
    const t0 = performance.now()

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const elapsed = (performance.now() - t0) / 1000

      smoothRef.current.x += (mouseRef.current.x - smoothRef.current.x) * 0.04
      smoothRef.current.y += (mouseRef.current.y - smoothRef.current.y) * 0.04

      world.rotation.y = Math.sin(elapsed * 0.11) * 0.04 + smoothRef.current.x * 0.05
      world.rotation.x = smoothRef.current.y * 0.07
      canopyGroup.position.x = smoothRef.current.x * 0.12
      canopyGroup.position.y = smoothRef.current.y * 0.06

      camera.position.x = smoothRef.current.x * 0.35
      camera.position.y = 0.35 - smoothRef.current.y * 0.25
      camera.lookAt(0, 0.85, -2)

      const breath = 0.92 + 0.08 * Math.sin(elapsed * 0.35)
      for (const t of tubes) {
        const m = t.mesh.material as MeshBasicMaterial
        m.opacity = t.baseOp * breath * (0.95 + 0.05 * Math.sin(elapsed * 0.2 + t.phase))
      }

      const arr = mAttr.array as Float32Array
      const dt = 0.016
      for (let i = 0; i < MOTE_N; i++) {
        const vy = mVel[i] ?? 0.3
        const yi = i * 3 + 1
        arr[yi] = (arr[yi] ?? 0) + vy * dt * 0.12
        if ((arr[yi] ?? 0) > 5) {
          arr[yi] = -5
          arr[i * 3] = (rng() - 0.5) * 14
          arr[i * 3 + 2] = (rng() - 0.5) * 8
        }
      }
      mAttr.needsUpdate = true

      renderer.render(scene, camera)
    }

    if (reduced) {
      renderer.render(scene, camera)
    } else {
      raf = requestAnimationFrame(animate)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('mousemove', onMouse)
      glowTex.dispose()
      world.traverse((obj) => {
        if (obj instanceof Mesh || obj instanceof LineSegments || obj instanceof Points) {
          obj.geometry.dispose()
          const mat = obj.material
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else mat.dispose()
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100%' }} />
}
