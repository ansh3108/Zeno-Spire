"use client"

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

export default function GameCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [scaleUi, setScaleUi] = useState(1)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)

  useEffect(() => {
    if (!mountRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x010204)
    scene.fog = new THREE.FogExp2(0x010204, 0.012)

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 8000)
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: "high-performance",
      logarithmicDepthBuffer: true
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.4
    mountRef.current.appendChild(renderer.domElement)

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.8, 0.5, 0.85)
    bloomPass.threshold = 0.15
    bloomPass.strength = 1.2
    bloomPass.radius = 0.7
    composer.addPass(bloomPass)

    scene.add(new THREE.AmbientLight(0xffffff, 0.3))

    const dirLight = new THREE.DirectionalLight(0x4477ff, 4)
    dirLight.position.set(20, 50, 30)
    scene.add(dirLight)

    const rimLight = new THREE.DirectionalLight(0xff0055, 2.5)
    rimLight.position.set(-30, -10, -20)
    scene.add(rimLight)

    const monolithGroup = new THREE.Group()
    scene.add(monolithGroup)

    const monolithMat = new THREE.MeshPhysicalMaterial({
      color: 0x05070a,
      metalness: 0.95,
      roughness: 0.3,
      clearcoat: 1.0
    })
    const monolith = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 3000, 32), monolithMat)
    monolith.position.set(0, 0, -25)
    monolithGroup.add(monolith)

    const wireMat = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff, 
      wireframe: true, 
      transparent: true, 
      opacity: 0.08 
    })
    const monolithWire = new THREE.Mesh(new THREE.CylinderGeometry(15.3, 15.3, 3000, 16, 150), wireMat)
    monolithWire.position.set(0, 0, -25)
    monolithGroup.add(monolithWire)

    const playerGroup = new THREE.Group()
    scene.add(playerGroup)

    const coreGeo = new THREE.OctahedronGeometry(0.4, 0)
    const coreMat = new THREE.MeshPhysicalMaterial({ 
      color: 0x00ffff, 
      emissive: 0x00ffff, 
      emissiveIntensity: 1.2,
      roughness: 0.0,
      metalness: 1.0,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.98
    })
    const playerCore = new THREE.Mesh(coreGeo, coreMat)
    playerGroup.add(playerCore)

    const ringMat = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      emissive: 0x1133aa,
      emissiveIntensity: 1.0,
      roughness: 0.2, 
      metalness: 1.0 
    })
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 16, 64), ringMat)
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.03, 16, 64), ringMat)
    playerGroup.add(ring1, ring2)

    const playerLight = new THREE.PointLight(0x00ffff, 8, 30)
    playerGroup.add(playerLight)

    const trailCount = 25
    const trailGeo = new THREE.BufferGeometry()
    const trailPos = new Float32Array(trailCount * 3)
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3))
    const trailMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 })
    const trail = new THREE.Line(trailGeo, trailMat)
    scene.add(trail)

    const platGeo = new THREE.BoxGeometry(1, 1, 1)
    const baseColors = [0x00ffff, 0xff0055, 0x8800ff]
    const materials = baseColors.map(c => 
      new THREE.MeshPhysicalMaterial({ 
        color: 0x020305, 
        emissive: c, 
        emissiveIntensity: 0.8, 
        roughness: 0.1, 
        metalness: 0.95,
        clearcoat: 1.0 
      })
    )

    const instancedMeshes = [
      new THREE.InstancedMesh(platGeo, materials[0], 400),
      new THREE.InstancedMesh(platGeo, materials[1], 400),
      new THREE.InstancedMesh(platGeo, materials[2], 400)
    ]
    instancedMeshes.forEach(m => scene.add(m))

    const pCount = 1500
    const pGeo = new THREE.BufferGeometry()
    const pPos = new Float32Array(pCount * 3)
    for(let i = 0; i < pCount; i++) {
      pPos[i*3] = (Math.random() - 0.5) * 200
      pPos[i*3+1] = (Math.random() - 0.5) * 200
      pPos[i*3+2] = (Math.random() - 0.5) * 80 - 10
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.5 })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    const keys = { a: false, d: false, space: false, q: false, e: false }
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      const k = e.code.toLowerCase().replace('key', '')
      if (k in keys) keys[k as keyof typeof keys] = isDown
      if (isDown && !audioCtxRef.current) initAudio()
      if (isDown && k === 'space' && !gameStarted) {
        setGameStarted(true)
      }
    }
    window.addEventListener('keydown', e => handleKey(e, true))
    window.addEventListener('keyup', e => handleKey(e, false))

    const initAudio = () => {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
      if (!audioCtxRef.current) return
      const osc = audioCtxRef.current.createOscillator()
      const gain = audioCtxRef.current.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime)
      gain.gain.setValueAtTime(vol, audioCtxRef.current.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + duration)
      osc.connect(gain)
      gain.connect(audioCtxRef.current.destination)
      osc.start()
      osc.stop(audioCtxRef.current.currentTime + duration)
    }

    let px = 0, py = 10
    let vx = 0, vy = 0
    let currentScale = 1
    let targetScale = 1
    let colorShift = 0
    let shiftsCompleted = 0
    let lastTime = performance.now()
    let animationId: number
    let highestY = py
    let shakeIntensity = 0
    let jumpCount = 0
    
    const trailHistory: THREE.Vector3[] = Array(trailCount).fill(new THREE.Vector3(0, 10, 0))
    const dummy = new THREE.Object3D()

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      const now = performance.now()
      const delta = Math.min((now - lastTime) / 1000, 0.03)
      lastTime = now

      const t = now * 0.002
      playerCore.rotation.y = t * 1.5
      playerCore.rotation.x = t * 0.8
      ring1.rotation.x = Math.PI / 2 + Math.sin(t) * 0.4
      ring1.rotation.y = t * 2
      ring2.rotation.z = Math.PI / 2 + Math.cos(t * 1.1) * 0.5
      ring2.rotation.x = -t * 1.5
      
      if (keys.q) targetScale *= 0.94
      if (keys.e) targetScale *= 1.06
      currentScale += (targetScale - currentScale) * 14 * delta

      if (currentScale > 3.1622) {
        currentScale /= 10
        targetScale /= 10
        px /= 10
        py /= 10
        highestY /= 10
        colorShift = (colorShift + 1) % 3
        shiftsCompleted++
        setScore(shiftsCompleted)
        shakeIntensity = 1.0
        playTone(150 / currentScale, 'sine', 0.6, 0.25)
      } else if (currentScale < 0.3162) {
        currentScale *= 10
        targetScale *= 10
        px *= 10
        py *= 10
        highestY *= 10
        colorShift = (colorShift + 2) % 3
        shiftsCompleted--
        setScore(shiftsCompleted)
        shakeIntensity = 1.0
        playTone(800 * currentScale, 'sine', 0.6, 0.25)
      }

      setScaleUi(currentScale)
      playerLight.distance = 35 * currentScale
      
      trailHistory.pop()
      trailHistory.unshift(new THREE.Vector3(px, py + 0.5 * currentScale, 0))
      for (let i = 0; i < trailCount; i++) {
        trailPos[i*3] = trailHistory[i].x
        trailPos[i*3+1] = trailHistory[i].y
        trailPos[i*3+2] = trailHistory[i].z
      }
      trailGeo.attributes.position.needsUpdate = true

      const targetVx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0)
      vx += (targetVx * 20 * currentScale - vx) * 12 * delta

      vy -= 80 * currentScale * delta
      vy = Math.max(vy, -100 * currentScale)
      
      let nextX = px + vx * delta
      let nextY = py + vy * delta

      const playerW = 0.6 * currentScale
      let canJump = false
      let maxHitY = -Infinity

      for (let l = -1; l <= 1; l++) {
        const S = Math.pow(10, l)
        const stepY = 8 * S
        const startIdx = Math.floor(py / stepY) - 30
        const endIdx = startIdx + 60
        const pattern = [0, 3, 6, 8, 9, 8, 6, 3, 0, -3, -6, -8, -9, -8, -6, -3]

        for (let idx = startIdx; idx <= endIdx; idx++) {
          if (Math.abs(idx) % 7 === 0) continue
          const pVal = pattern[(idx % 16 + 16) % 16]
          const pX = pVal * S
          const pTop = idx * stepY + 0.25 * S
          const pW = 5.5 * S

          const left = pX - pW / 2 - playerW / 2
          const right = pX + pW / 2 + playerW / 2
          
          if (nextX > left && nextX < right) {
            if (py >= pTop - 0.2 * currentScale && nextY <= pTop) {
              if (pTop > maxHitY) {
                maxHitY = pTop
                canJump = true
              }
            }
          }
        }
      }

      if (canJump) {
        if (vy < -20 * currentScale) {
          shakeIntensity = Math.min(Math.abs(vy) * 0.012, 0.5)
          playTone(60, 'triangle', 0.25, 0.2)
        }
        nextY = maxHitY
        vy = 0
        playerLight.intensity = 12
        jumpCount = 0
      }
      playerLight.intensity += (6 - playerLight.intensity) * 0.1

      if (keys.space && canJump && jumpCount < 2) {
        vy = 32 * currentScale
        keys.space = false
        jumpCount++
        playTone(400 * currentScale * (1 + jumpCount * 0.3), 'square', 0.12, 0.1)
      }

      px = nextX
      py = nextY

      if (py > highestY) {
        highestY = py
        const currentHigh = Math.floor(highestY / 10)
        setHighScore(prev => currentHigh > prev ? currentHigh : prev)
      }
      if (py < highestY - 50 * currentScale) {
        px = 0
        py = highestY + 15 * currentScale
        vy = 0
        highestY = py
        shakeIntensity = 0.6
        playTone(100, 'sawtooth', 0.4, 0.15)
      }

      const scaleY = 1.0 + Math.min(Math.abs(vy) * 0.018, 0.5) * (vy > 0 ? 1 : -1)
      const scaleX = 1.0 / scaleY
      playerCore.scale.set(scaleX, scaleY, scaleX)

      playerGroup.position.set(px, py + 0.5 * currentScale, 0)
      playerGroup.scale.setScalar(currentScale)

      const shakeX = (Math.random() - 0.5) * shakeIntensity
      const shakeY = (Math.random() - 0.5) * shakeIntensity
      shakeIntensity *= 0.82

      camera.position.x += (px * 0.4 + vx * 0.25 - camera.position.x) * 7 * delta + shakeX
      camera.position.y += ((py + 7 * currentScale) - camera.position.y) * 9 * delta + shakeY
      camera.position.z += (30 * currentScale - camera.position.z) * 9 * delta
      camera.lookAt(px * 0.5, py + 2.5 * currentScale, -5)
      
      const fog = scene.fog as THREE.FogExp2
      fog.density = 0.012 / currentScale

      particles.position.x = px * 0.9
      particles.position.y = py * 0.9
      particles.scale.setScalar(currentScale)
      
      monolithGroup.position.y = py
      monolithGroup.scale.setScalar(currentScale)

      for (let l = -1; l <= 1; l++) {
        const S = Math.pow(10, l)
        const meshIdx = (l + 1 + colorShift) % 3
        const mesh = instancedMeshes[meshIdx]
        
        const stepY = 8 * S
        const startIdx = Math.floor(py / stepY) - 30
        const endIdx = startIdx + 60
        const pattern = [0, 3, 6, 8, 9, 8, 6, 3, 0, -3, -6, -8, -9, -8, -6, -3]
        
        let i = 0
        for (let idx = startIdx; idx <= endIdx; idx++) {
          if (Math.abs(idx) % 7 === 0) continue
          if (i >= 400) break
          const pVal = pattern[(idx % 16 + 16) % 16]
          dummy.position.set(pVal * S, idx * stepY, -2 * S)
          dummy.scale.set(5.5 * S, 0.5 * S, 4 * S)
          dummy.updateMatrix()
          mesh.setMatrixAt(i++, dummy.matrix)
        }
        mesh.count = i
        mesh.instanceMatrix.needsUpdate = true
      }

      composer.render()
    }
    
    animate()

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      composer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', e => handleKey(e, true))
      window.removeEventListener('keyup', e => handleKey(e, false))
      cancelAnimationFrame(animationId)
      
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          if (object.geometry) object.geometry.dispose()
          if (object.material) {
            if (Array.isArray(object.material)) object.material.forEach(m => m.dispose())
            else object.material.dispose()
          }
        }
      })
      renderer.dispose()
    }
  }, [])

  return (
    <div className="relative w-full h-full bg-[#010204] overflow-hidden font-sans select-none">
      <div ref={mountRef} className="absolute inset-0" />
      
      <div className="absolute top-8 left-8 flex flex-col gap-6 z-10 pointer-events-none">
        <h1 className="text-5xl font-black tracking-[0.45em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_30px_rgba(0,255,255,0.5)]">
          Zeno's Spire
        </h1>
        
        <div className="bg-[#030612]/95 backdrop-blur-3xl border border-cyan-400/30 rounded-2xl p-7 w-[340px] shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-600" />
          
          <div className="flex justify-between items-end mb-4 mt-2">
            <span className="text-cyan-500 text-[10px] tracking-[0.3em] uppercase font-bold">Entity Scale</span>
            <span className="text-white font-mono font-bold text-4xl leading-none tracking-tight drop-shadow-[0_0_10px_rgba(0,255,255,0.6)]">
              x{scaleUi.toFixed(2)}
            </span>
          </div>
          
          <div className="h-2.5 w-full bg-black/80 rounded-full overflow-hidden mb-8 border border-white/10 relative shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-75 relative z-10 shadow-[0_0_15px_rgba(0,255,255,0.9)]"
              style={{ width: `${Math.max(0, Math.min(100, ((Math.log10(scaleUi) + 0.5) / 1) * 100))}%` }}
            />
          </div>

          <div className="flex justify-between items-center mb-4 py-5 border-y border-white/10">
            <span className="text-cyan-500 text-[10px] tracking-[0.3em] uppercase font-bold">Realm Shifts</span>
            <span className={`font-mono font-black text-5xl ${score > 0 ? 'text-pink-500' : score < 0 ? 'text-indigo-400' : 'text-gray-100'} drop-shadow-lg`}>
              {score > 0 ? '+' : ''}{score}
            </span>
          </div>

          <div className="flex justify-between items-center mb-6 py-3">
            <span className="text-cyan-500 text-[10px] tracking-[0.3em] uppercase font-bold">High Score</span>
            <span className="font-mono font-bold text-2xl text-amber-400 drop-shadow-[0_0_8px_rgba(255,200,0,0.5)]">
              {highScore}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-5 text-xs text-gray-300 font-bold tracking-widest uppercase">
            <div className="flex items-center gap-4"><span className="bg-white/10 border border-white/20 px-3 py-2 rounded-md text-white min-w-[40px] text-center shadow-lg">A D</span> Move</div>
            <div className="flex items-center gap-4"><span className="bg-white/10 border border-white/20 px-3 py-2 rounded-md text-white min-w-[48px] text-center shadow-lg">SPC</span> Jump</div>
            <div className="flex items-center gap-4"><span className="bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 px-3 py-2 rounded-md min-w-[40px] text-center shadow-[0_0_10px_rgba(0,255,255,0.3)]">Q</span> Shrink</div>
            <div className="flex items-center gap-4"><span className="bg-blue-500/20 border border-blue-400/40 text-blue-300 px-3 py-2 rounded-md min-w-[40px] text-center shadow-[0_0_10px_rgba(0,100,255,0.3)]">E</span> Grow</div>
          </div>
        </div>
      </div>

      {!gameStarted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20">
          <h2 className="text-7xl font-black tracking-[0.5em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mb-8 drop-shadow-[0_0_40px_rgba(0,255,255,0.6)]">
            Zeno's Spire
          </h2>
          <p className="text-xl text-gray-300 mb-12 font-light italic">"To reach infinity, you must first cross half the distance."</p>
          <button 
            onClick={() => {
              setGameStarted(true)
              if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
              }
            }}
            className="px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_50px_rgba(0,255,255,0.8)] uppercase tracking-widest"
          >
            Begin Ascent
          </button>
          <p className="text-gray-500 text-sm mt-8">Press SPACE to start</p>
        </div>
      )}
    </div>
  )
}



