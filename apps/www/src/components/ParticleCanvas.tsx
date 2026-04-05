import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ParticleCanvas({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const container = mountRef.current
    if (!container) return

    // ---- Renderer ----
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    // ---- Scene / Camera ----
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      200,
    )
    camera.position.z = 4

    // ---- Soft circular point texture ----
    const texCanvas = document.createElement('canvas')
    texCanvas.width = 64
    texCanvas.height = 64
    const ctx = texCanvas.getContext('2d')!
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.25, 'rgba(255,255,255,0.9)')
    grad.addColorStop(0.6, 'rgba(255,255,255,0.35)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, 64)
    const tex = new THREE.CanvasTexture(texCanvas)

    // ---- Helper: create a particle layer ----
    type Layer = { points: THREE.Points; geo: THREE.BufferGeometry; mat: THREE.PointsMaterial }

    function makeLayer(
      count: number,
      rMin: number,
      rMax: number,
      palette: THREE.Color[],
      brightnessMin: number,
      brightnessMax: number,
      size: number,
      yFlatten = 0.55,
    ): Layer {
      const pos = new Float32Array(count * 3)
      const col = new Float32Array(count * 3)

      for (let i = 0; i < count; i++) {
        // Uniform spherical distribution (y-up convention)
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const r = rMin + Math.random() * (rMax - rMin)

        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
        pos[i * 3 + 1] = r * Math.cos(phi) * yFlatten
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)

        const base = palette[Math.floor(Math.random() * palette.length)]
        const b = brightnessMin + Math.random() * (brightnessMax - brightnessMin)
        col[i * 3] = base.r * b
        col[i * 3 + 1] = base.g * b
        col[i * 3 + 2] = base.b * b
      }

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3))

      const mat = new THREE.PointsMaterial({
        size,
        map: tex,
        vertexColors: true,
        transparent: true,
        alphaTest: 0.005,
        depthWrite: false,
        sizeAttenuation: true,
      })

      return { points: new THREE.Points(geo, mat), geo, mat }
    }

    // ---- Color palettes ----
    // Cool: violet-blue stars (background atmosphere)
    const cool = [
      new THREE.Color(0x9b90b0),
      new THREE.Color(0xb0a8d0),
      new THREE.Color(0x6eb8c4),
      new THREE.Color(0x8090b8),
    ]
    // Warm: sunset orange midground
    const warm = [
      new THREE.Color(0xe88838),
      new THREE.Color(0xffc078),
      new THREE.Color(0xb0a8d0),
      new THREE.Color(0xc08048),
    ]
    // Hot: bright accent foreground stars
    const hot = [
      new THREE.Color(0xffc078),
      new THREE.Color(0xffe4b0),
      new THREE.Color(0x6eb8c4),
      new THREE.Color(0xffffff),
    ]

    const countFactor = reduced ? 0.025 : 1

    const bg = makeLayer(
      Math.round(900 * countFactor),
      2.5, 6.0, cool, 0.3, 0.65, 0.014, 0.5,
    )
    const mid = makeLayer(
      Math.round(360 * countFactor),
      1.5, 3.8, warm, 0.5, 0.88, 0.028, 0.6,
    )
    const fg = makeLayer(
      Math.round(80 * countFactor),
      0.8, 2.2, hot, 0.75, 1.0, 0.060, 0.7,
    )

    scene.add(bg.points, mid.points, fg.points)

    // ---- Animation loop ----
    let raf = 0
    let t = 0

    const animate = () => {
      raf = requestAnimationFrame(animate)
      t += 0.0008

      // Counter-rotating layers at different speeds = parallax depth illusion
      bg.points.rotation.y = t * 0.10
      bg.points.rotation.x = Math.sin(t * 0.07) * 0.05

      mid.points.rotation.y = -t * 0.065
      mid.points.rotation.x = Math.cos(t * 0.09) * 0.06

      fg.points.rotation.y = t * 0.14
      fg.points.rotation.x = Math.sin(t * 0.11) * 0.04

      // Gentle camera drift gives a breathing / living quality
      camera.position.x = Math.sin(t * 0.28) * 0.09
      camera.position.y = Math.cos(t * 0.18) * 0.055

      renderer.render(scene, camera)
    }

    if (reduced) {
      renderer.render(scene, camera)
    } else {
      animate()
    }

    // ---- Resize handling ----
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    })
    ro.observe(container)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      ;[bg, mid, fg].forEach(({ geo, mat }) => {
        geo.dispose()
        mat.dispose()
      })
      tex.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={mountRef} className={className} aria-hidden="true" role="presentation" />
}
