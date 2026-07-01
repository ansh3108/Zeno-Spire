"use client"

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'

export default function GameCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [scaleLevel, setScaleLevel] = useState(0)
  const controlsRef = useRef<PointerLockControls | null>(null)

  useEffect(() => {
    if (!mountRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020203)
    scene.fog = new THREE.FogExp2(0x020203, 0.015)

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000)
    
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mountRef.current.appendChild(renderer.domElement)

    const controls = new PointerLockControls(camera, renderer.domElement)
    controlsRef.current = controls
    controls.object.position.set(0, 1.7, 5)
    scene.add(controls.object)

    controls.addEventListener('lock', () => setIsLocked(true))
    controls.addEventListener('unlock', () => setIsLocked(false))

    scene.add(new THREE.AmbientLight(0xffffff, 0.2))
    const dirLight = new THREE.DirectionalLight(0x00ffcc, 1)
    dirLight.position.set(10, 20, 10)
    scene.add(dirLight)

    const worldGroup = new THREE.Group()
    scene.add(worldGroup)

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2 })
    
    const floorStart = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat)
    floorStart.rotation.x = -Math.PI / 2
    floorStart.position.set(0, 0, 0)
    worldGroup.add(floorStart)

    const floorEnd = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat)
    floorEnd.rotation.x = -Math.PI / 2
    floorEnd.position.set(0, 0, -30)
    worldGroup.add(floorEnd)

    const gridStart = new THREE.GridHelper(20, 20, 0x00ffcc, 0x003344)
    gridStart.position.set(0, 0.01, 0)
    worldGroup.add(gridStart)

    const gridEnd = new THREE.GridHelper(20, 20, 0x00ffcc, 0x003344)
    gridEnd.position.set(0, 0.01, -30)
    worldGroup.add(gridEnd)

    const gapGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 10),
      new THREE.MeshBasicMaterial({ color: 0xff0055, transparent: true, opacity: 0.2 })
    )
    gapGlow.rotation.x = -Math.PI / 2
    gapGlow.position.set(0, -2, -15)
    worldGroup.add(gapGlow)

    const keys = { w: false, a: false, s: false, d: false, q: false, e: false, space: false }
    
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') keys.w = true
      if (e.code === 'KeyA') keys.a = true
      if (e.code === 'KeyS') keys.s = true
      if (e.code === 'KeyD') keys.d = true
      if (e.code === 'KeyQ') keys.q = true
      if (e.code === 'KeyE') keys.e = true
      if (e.code === 'Space') keys.space = true
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') keys.w = false
      if (e.code === 'KeyA') keys.a = false
      if (e.code === 'KeyS') keys.s = false
      if (e.code === 'KeyD') keys.d = false
      if (e.code === 'KeyQ') keys.q = false
      if (e.code === 'KeyE') keys.e = false
      if (e.code === 'Space') keys.space = false
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)

    let currentScale = 1
    let targetScale = 1
    let canJump = false
    let lastLevel = 0
    const velocity = new THREE.Vector3()
    const direction = new THREE.Vector3()
    
    let lastTime = performance.now()
    let animationId: number

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      const time = performance.now()
      const delta = Math.min((time - lastTime) / 1000, 0.05)
      lastTime = time

      if (controls.isLocked) {
        if (keys.q) targetScale *= 0.96
        if (keys.e) targetScale *= 1.04
        
        targetScale = Math.max(0.01, Math.min(50, targetScale))

        if (Math.abs(currentScale - targetScale) > 0.001) {
          currentScale += (targetScale - currentScale) * 0.1
          camera.fov = 75 - (Math.log10(currentScale) * 15)
          camera.updateProjectionMatrix()
          
          const expFog = scene.fog as THREE.FogExp2
          if (expFog) expFog.density = 0.015 / Math.sqrt(currentScale)

          const newLevel = Math.round(Math.log10(currentScale) * -1)
          if (newLevel !== lastLevel) {
            lastLevel = newLevel
            setScaleLevel(newLevel)
          }
        }

        const px = controls.object.position.x
        const pz = controls.object.position.z
        
        const isOverGap = pz < -10 && pz > -20
        const isOffSides = px < -10 || px > 10
        const groundY = (isOverGap || isOffSides) ? -100 : 0

        velocity.x -= velocity.x * 10.0 * delta
        velocity.z -= velocity.z * 10.0 * delta
        velocity.y -= 40.0 * currentScale * delta

        direction.z = Number(keys.w) - Number(keys.s)
        direction.x = Number(keys.d) - Number(keys.a)
        direction.normalize()

        const speed = 60.0 * currentScale
        if (keys.w || keys.s) velocity.z -= direction.z * speed * delta
        if (keys.a || keys.d) velocity.x -= direction.x * speed * delta

        controls.moveRight(-velocity.x * delta)
        controls.moveForward(-velocity.z * delta)
        controls.object.position.y += velocity.y * delta

        const playerHeight = 1.7 * currentScale

        if (controls.object.position.y <= groundY + playerHeight) {
          velocity.y = 0
          controls.object.position.y = groundY + playerHeight
          canJump = true
        } else {
          canJump = false
        }

        if (keys.space && canJump) {
          velocity.y = 15 * currentScale
          canJump = false
          keys.space = false 
        }

        if (controls.object.position.y < -20 * currentScale) {
          controls.object.position.set(0, 1.7 * currentScale, 5)
          velocity.set(0, 0, 0)
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      cancelAnimationFrame(animationId)
      
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose()
          if (object.material) object.material.dispose()
        }
      })
      
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return (
    <div className="relative w-full h-full bg-black">
      <div ref={mountRef} className="absolute inset-0" />
      
      {isLocked && (
        <div className="absolute top-6 left-6 text-white font-mono text-sm bg-black/60 px-5 py-3 rounded border border-cyan-900 backdrop-blur-md">
          <p className="text-cyan-400 font-bold tracking-widest uppercase mb-1">
            Scale: {scaleLevel > 0 ? `Micro ${scaleLevel}` : scaleLevel < 0 ? `Macro ${Math.abs(scaleLevel)}` : 'Normal'}
          </p>
          <p className="text-gray-400 text-xs">Q: Shrink | E: Grow</p>
        </div>
      )}

      {!isLocked && (
        <div 
          onClick={() => controlsRef.current?.lock()}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10 cursor-pointer select-none backdrop-blur-sm"
        >
          <h1 className="text-5xl font-black mb-4 tracking-[0.3em] uppercase text-cyan-400">
            Zeno's Spire
          </h1>
          <p className="text-gray-400 mb-8 tracking-widest">Click to start</p>
          <div className="flex flex-col gap-2 text-sm text-gray-500 font-mono">
            <p>WASD - Move</p>
            <p>SPACE - Jump</p>
            <p>Q/E - Scale</p>
          </div>
        </div>
      )}
    </div>
  )
}