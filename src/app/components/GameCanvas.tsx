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
  const [currentBiome, setCurrentBiome] = useState<'normal' | 'micro' | 'macro'>('normal')

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
    const monolithMat = new THREE.MeshPhysicalMaterial({ color: 0x05070a, metalness: 0.95, roughness: 0.3, clearcoat: 1.0 })
    const monolith = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 3000, 32), monolithMat)
    monolith.position.set(0, 0, -25)
    monolithGroup.add(monolith)
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.08 })
    const monolithWire = new THREE.Mesh(new THREE.CylinderGeometry(15.3, 15.3, 3000, 16, 150), wireMat)
    monolithWire.position.set(0, 0, -25)
    monolithGroup.add(monolithWire)

    const playerGroup = new THREE.Group()
    scene.add(playerGroup)
    const coreMat = new THREE.MeshPhysicalMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.2, roughness: 0.0, metalness: 1.0, clearcoat: 1.0, transparent: true, opacity: 0.98 })
    const playerCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), coreMat)
    playerGroup.add(playerCore)
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x1133aa, emissiveIntensity: 1.0, roughness: 0.2, metalness: 1.0 })
    playerGroup.add(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 16, 64), ringMat))
    playerGroup.add(new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.03, 16, 64), ringMat))
    const playerLight = new THREE.PointLight(0x00ffff, 8, 30)
    playerGroup.add(playerLight)

    const trailGeo = new THREE.BufferGeometry()
    const trailPos = new Float32Array(75)
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3))
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 }))
    scene.add(trail)

    const normalMat = new THREE.MeshPhysicalMaterial({ color: 0x020305, emissive: 0xff0055, emissiveIntensity: 0.8, roughness: 0.1, metalness: 0.95, clearcoat: 1.0 })
    const microMat = new THREE.MeshPhysicalMaterial({ color: 0x0a1a0a, emissive: 0x00ff88, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.2, clearcoat: 0.5, transparent: true, opacity: 0.9 })
    const macroMat = new THREE.MeshStandardMaterial({ color: 0x2a2a35, emissive: 0x111122, emissiveIntensity: 0.3, roughness: 0.9, metalness: 0.1 })

    const instancedMeshes = [
      new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), normalMat, 800),
      new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), microMat, 800),
      new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), macroMat, 800)
    ]
    
    instancedMeshes.forEach(m => {
      m.frustumCulled = false
      m.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 500000)
      scene.add(m)
    })

    const laserGroup = new THREE.Group()
    scene.add(laserGroup)
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 })
    const lasers: THREE.Mesh[] = []
    for (let i = 0; i < 10; i++) {
      const laser = new THREE.Mesh(new THREE.BoxGeometry(100, 0.5, 0.5), laserMat)
      laser.position.set(0, 100 + i * 300, -5)
      laserGroup.add(laser)
      lasers.push(laser)
    }

    const keyGeo = new THREE.IcosahedronGeometry(0.5, 0)
    const keyMat = new THREE.MeshPhysicalMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 1.5, roughness: 0.1, metalness: 0.8 })
    const worldKey = new THREE.Mesh(keyGeo, keyMat)
    worldKey.position.set(12, 15, 0)
    scene.add(worldKey)

    const afterimages: THREE.Mesh[] = []
    const afterimageMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 })

    const pGeo = new THREE.BufferGeometry()
    const pPos = new Float32Array(4500)
    for(let i = 0; i < 1500; i++) {
      pPos[i*3] = (Math.random() - 0.5) * 200
      pPos[i*3+1] = (Math.random() - 0.5) * 200
      pPos[i*3+2] = (Math.random() - 0.5) * 80 - 10
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.5 })))

    const keys = { a: false, d: false, space: false, q: false, e: false, shift: false, f: false }
    let spacePressedThisFrame = false
    let fPressedThisFrame = false

    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      const k = e.code.toLowerCase().replace('key', '')
      if (k === 'space' && isDown && !keys.space) spacePressedThisFrame = true
      if (k === 'keyf' && isDown && !keys.f) fPressedThisFrame = true
      if (k in keys) keys[k as keyof typeof keys] = isDown
      if (isDown && !audioCtxRef.current) initAudio()
      if (isDown && k === 'space' && !gameStarted) setGameStarted(true)
    }
    window.addEventListener('keydown', e => handleKey(e, true))
    window.addEventListener('keyup', e => handleKey(e, false))

    const initAudio = () => {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    
    const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
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

    let px = 0, py = 10, vx = 0, vy = 0
    let currentScale = 1, targetScale = 1, colorShift = 0, shiftsCompleted = 0
    let lastTime = performance.now(), highestY = py, shakeIntensity = 0, jumpCount = 0, onGround = false
    let timeScale = 1.0
    let isZenoDashing = false, zenoDashFrames = 0, zenoDashDirection = 1
    let heldObject: THREE.Mesh | null = null
    let keyCollected = false
    
    const trailHistory = Array(25).fill(new THREE.Vector3(0, 10, 0))
    const dummy = new THREE.Object3D()

    const generatePlatforms = (S: number, playerY: number) => {
      const plats = []
      const stepY = 8 * S
      const startIdx = Math.floor(playerY / stepY) - 80
      const pattern = [1, 4, 7, 9, 10, 9, 7, 4, 1, -2, -5, -7, -8, -7, -5, -2]

      for (let idx = startIdx; idx <= startIdx + 160; idx++) {
        if (Math.abs(idx) % 11 === 0) continue
        const pVal = pattern[(idx % 16 + 16) % 16]
        plats.push({ x: pVal * S, y: idx * stepY, top: idx * stepY + 0.25 * S, w: 5.5 * S })
      }
      return plats
    }

    const updateBiome = (scale: number) => {
      let newBiome: 'normal' | 'micro' | 'macro' = 'normal'
      let targetColor = new THREE.Color(0x010204)
      let targetFogDensity = 0.012

      if (scale < 0.3) {
        newBiome = 'micro'
        targetColor = new THREE.Color(0x051a0a)
        targetFogDensity = 0.04
      } else if (scale > 3.0) {
        newBiome = 'macro'
        targetColor = new THREE.Color(0x020208)
        targetFogDensity = 0.005
      }

      if (newBiome !== currentBiome) setCurrentBiome(newBiome)

      const bg = scene.background as THREE.Color
      if (bg) bg.lerp(targetColor, 0.05)
      
      const fog = scene.fog as THREE.FogExp2
      if (fog) {
        fog.color.lerp(targetColor, 0.05)
        fog.density += (targetFogDensity - fog.density) * 0.05
      }
    }

    const animate = () => {
      const animationId = requestAnimationFrame(animate)
      const now = performance.now()
      const rawDelta = Math.min((now - lastTime) / 1000, 0.03)
      lastTime = now
      const t = now * 0.002

      const targetTimeScale = currentScale > 2.5 ? 0.3 : (currentScale < 0.4 ? 1.8 : 1.0)
      timeScale += (targetTimeScale - timeScale) * 3 * rawDelta
      const delta = rawDelta * timeScale

      playerCore.rotation.y = t * 1.5 * timeScale
      playerCore.rotation.x = t * 0.8 * timeScale
      playerGroup.children[1].rotation.x = Math.PI / 2 + Math.sin(t) * 0.4
      playerGroup.children[1].rotation.y = t * 2 * timeScale
      playerGroup.children[2].rotation.z = Math.PI / 2 + Math.cos(t * 1.1) * 0.5
      playerGroup.children[2].rotation.x = -t * 1.5 * timeScale
      
      if (keys.q) targetScale *= 0.94
      if (keys.e) targetScale *= 1.06
      currentScale += (targetScale - currentScale) * 14 * delta
      updateBiome(currentScale)

      if (currentScale > 3.1622) {
        currentScale /= 10; targetScale /= 10; px /= 10; py /= 10; highestY /= 10
        colorShift = (colorShift + 1) % 3; shiftsCompleted++; setScore(shiftsCompleted)
        shakeIntensity = 1.0; playTone(150 / currentScale, 'sine', 0.6, 0.25)
      } else if (currentScale < 0.3162) {
        currentScale *= 10; targetScale *= 10; px *= 10; py *= 10; highestY *= 10
        colorShift = (colorShift + 2) % 3; shiftsCompleted--; setScore(shiftsCompleted)
        shakeIntensity = 1.0; playTone(800 * currentScale, 'sine', 0.6, 0.25)
      }

      setScaleUi(currentScale)
      playerLight.distance = 35 * currentScale
      
      trailHistory.pop()
      trailHistory.unshift(new THREE.Vector3(px, py + 0.5 * currentScale, 0))
      for (let i = 0; i < 25; i++) {
        trailPos[i*3] = trailHistory[i].x
        trailPos[i*3+1] = trailHistory[i].y
        trailPos[i*3+2] = trailHistory[i].z
      }
      trailGeo.attributes.position.needsUpdate = true

      if (keys.shift && !isZenoDashing && onGround) {
        isZenoDashing = true
        zenoDashFrames = 0
        zenoDashDirection = vx >= 0 ? 1 : -1
        playTone(800, 'sine', 0.3, 0.15)
      }

      if (isZenoDashing) {
        zenoDashFrames++
        const maxDashDist = 12 * currentScale
        const step = maxDashDist * Math.pow(0.5, zenoDashFrames)
        px += zenoDashDirection * step * 3
        
        const afterimage = new THREE.Mesh(new THREE.OctahedronGeometry(0.4 * currentScale, 0), afterimageMat)
        afterimage.position.set(px, py + 0.5 * currentScale, 0)
        scene.add(afterimage)
        afterimages.push(afterimage)

        if (step < 0.05 || zenoDashFrames > 15) {
          isZenoDashing = false
          zenoDashFrames = 0
        }
      }

      for (let i = afterimages.length - 1; i >= 0; i--) {
        const img = afterimages[i]
        const mat = img.material as THREE.MeshBasicMaterial
        mat.opacity -= 0.05
        img.scale.multiplyScalar(0.9)
        if (mat.opacity <= 0) {
          scene.remove(img)
          afterimages.splice(i, 1)
        }
      }

      const targetVx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0)
      vx += (targetVx * 25 * currentScale - vx) * 15 * delta
      vy -= 90 * currentScale * delta
      vy = Math.max(vy, -120 * currentScale)
      
      let nextX = px + vx * delta
      let nextY = py + vy * delta
      const playerW = 0.6 * currentScale
      onGround = false
      let maxHitY = -Infinity

      for (let l = -1; l <= 1; l++) {
        const S = Math.pow(10, l)
        for (const p of generatePlatforms(S, py)) {
          if (nextX > p.x - p.w / 2 - playerW / 2 && nextX < p.x + p.w / 2 + playerW / 2) {
            if (py >= p.top - 0.2 * currentScale && nextY <= p.top && p.top > maxHitY) {
              maxHitY = p.top
              onGround = true
            }
          }
        }
      }

      for (const laser of lasers) {
        const laserY = laser.position.y * currentScale
        if (Math.abs(py - laserY) < 1.0 * currentScale && Math.abs(px) < 50 * currentScale && currentScale > 0.2) {
          py = highestY + 15 * currentScale; vy = 0; shakeIntensity = 1.0
          playTone(100, 'sawtooth', 0.5, 0.3)
        }
      }

      if (onGround) {
        if (vy < -20 * currentScale) {
          shakeIntensity = Math.min(Math.abs(vy) * 0.012, 0.5)
          playTone(60, 'triangle', 0.25, 0.2)
        }
        nextY = maxHitY; vy = 0; playerLight.intensity = 12; jumpCount = 0
      } else {
        playerLight.intensity += (6 - playerLight.intensity) * 0.1
      }

      if (spacePressedThisFrame) {
        if (onGround) {
          vy = 40 * currentScale; jumpCount = 1; onGround = false
          playTone(400 * currentScale, 'square', 0.12, 0.1)
        } else if (jumpCount < 2) {
          vy = 35 * currentScale; jumpCount = 2
          playTone(600 * currentScale, 'square', 0.12, 0.1)
        }
        spacePressedThisFrame = false
      }

      if (fPressedThisFrame) {
        if (!heldObject && !keyCollected) {
          const keyWorldPos = new THREE.Vector3()
          worldKey.getWorldPosition(keyWorldPos)
          const dist = Math.sqrt(Math.pow(px - keyWorldPos.x, 2) + Math.pow(py - keyWorldPos.y, 2))
          if (dist < 3 * currentScale) {
            heldObject = worldKey
            scene.remove(worldKey)
            playerGroup.add(heldObject)
            heldObject.position.set(1.2, 0, 0)
            playTone(1200, 'sine', 0.2, 0.1)
          }
        } else if (heldObject) {
          playerGroup.remove(heldObject)
          scene.add(heldObject)
          heldObject.position.set(px + 1.2 * currentScale, py, 0)
          heldObject = null
          playTone(300, 'sine', 0.2, 0.1)
        }
        fPressedThisFrame = false
      }

      if (heldObject) {
        heldObject.rotation.y += 2 * delta
        heldObject.rotation.x += 1 * delta
        if (currentScale > 5.0 && !keyCollected) {
          keyCollected = true
          setScore(prev => prev + 50)
          playTone(1500, 'sine', 0.5, 0.2)
          shakeIntensity = 0.5
        }
      } else if (!keyCollected) {
        worldKey.rotation.y += 2 * delta
        worldKey.position.y = 15 + Math.sin(t * 2) * 0.5
      }

      px = nextX; py = nextY

      if (py > highestY) {
        highestY = py
        setHighScore(prev => Math.floor(highestY / 10) > prev ? Math.floor(highestY / 10) : prev)
      }
      if (py < highestY - 50 * currentScale) {
        px = 0; py = highestY + 15 * currentScale; vy = 0; highestY = py
        shakeIntensity = 0.6; playTone(100, 'sawtooth', 0.4, 0.15)
      }

      const scaleY = 1.0 + Math.min(Math.abs(vy) * 0.018, 0.5) * (vy > 0 ? 1 : -1)
      playerCore.scale.set(1.0 / scaleY, scaleY, 1.0 / scaleY)
      playerGroup.position.set(px, py + 0.5 * currentScale, 0)
      playerGroup.scale.setScalar(currentScale)

      const shakeX = (Math.random() - 0.5) * shakeIntensity
      const shakeY = (Math.random() - 0.5) * shakeIntensity
      shakeIntensity *= 0.82

      camera.position.x += (px * 0.4 + vx * 0.25 - camera.position.x) * 7 * delta + shakeX
      camera.position.y += ((py + 7 * currentScale) - camera.position.y) * 9 * delta + shakeY
      camera.position.z += (30 * currentScale - camera.position.z) * 9 * delta
      camera.lookAt(px * 0.5, py + 2.5 * currentScale, -5)

      const particles = scene.children.find(c => c instanceof THREE.Points) as THREE.Points
      if (particles) {
        particles.position.x = px * 0.9
        particles.position.y = py * 0.9
        particles.scale.setScalar(currentScale)
      }
      
      monolithGroup.position.y = py
      monolithGroup.scale.setScalar(currentScale)

      lasers.forEach((laser, i) => {
        laser.position.y = 100 + i * 300 + Math.sin(t + i) * 10
      })

      for (let l = -1; l <= 1; l++) {
        const S = Math.pow(10, l)
        const mesh = instancedMeshes[(l + 1 + colorShift) % 3]
        const plats = generatePlatforms(S, py)
        let i = 0
        for (const p of plats) {
          if (i >= 800) break
          dummy.position.set(p.x, p.y, -2 * S)
          dummy.scale.set(p.w, 0.5 * S, 4 * S)
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
            <span className="text-cyan-500 text-[10px] tracking-[0.3em] uppercase font-bold">Current Realm</span>
            <span className={`font-mono font-black text-2xl uppercase tracking-widest ${
              currentBiome === 'micro' ? 'text-green-400' : 
              currentBiome === 'macro' ? 'text-indigo-400' : 'text-cyan-400'
            } drop-shadow-lg`}>
              {currentBiome}
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
            <div className="flex items-center gap-4"><span className="bg-purple-500/20 border border-purple-400/40 text-purple-300 px-3 py-2 rounded-md min-w-[40px] text-center shadow-[0_0_10px_rgba(150,0,255,0.3)]">SHIFT</span> Zeno Dash</div>
            <div className="flex items-center gap-4"><span className="bg-amber-500/20 border border-amber-400/40 text-amber-300 px-3 py-2 rounded-md min-w-[40px] text-center shadow-[0_0_10px_rgba(255,170,0,0.3)]">F</span> Grab Key</div>
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
              if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
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


