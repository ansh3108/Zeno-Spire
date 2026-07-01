"use client"

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'

export default function GameCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [isLocked, setIsLocked] = useState(false)
  const controlsRef = useRef<PointerLockControls | null>(null)

  useEffect(() => {
    if (!mountRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050508)
    scene.fog = new THREE.FogExp2(0x050508, 0.008)

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.001, 2000000)
    camera.position.set(0, 1.7, 20)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance"
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    mountRef.current.appendChild(renderer.domElement)

    const controls = new PointerLockControls(camera, renderer.domElement)
    controlsRef.current = controls

    const onLock = () => setIsLocked(true)
    const onUnlock = () => setIsLocked(false)
    controls.addEventListener('lock', onLock)
    controls.addEventListener('unlock', onUnlock)

    scene.add(controls.object)

    const worldGroup = new THREE.Group()
    scene.add(worldGroup)

    const dustGroup = new THREE.Group()
    scene.add(dustGroup)

    const hemiLight = new THREE.HemisphereLight(0x222244, 0x000000, 0.8)
    worldGroup.add(hemiLight)

    const moonLight = new THREE.DirectionalLight(0x88aaff, 2.5)
    moonLight.position.set(-50, 100, -50)
    moonLight.castShadow = true
    moonLight.shadow.mapSize.width = 4096
    moonLight.shadow.mapSize.height = 4096
    moonLight.shadow.camera.near = 1
    moonLight.shadow.camera.far = 300
    moonLight.shadow.camera.left = -100
    moonLight.shadow.camera.right = 100
    moonLight.shadow.camera.top = 100
    moonLight.shadow.camera.bottom = -100
    worldGroup.add(moonLight)

    const glassLight1 = new THREE.PointLight(0xff0055, 50, 40)
    glassLight1.position.set(-15, 20, -10)
    worldGroup.add(glassLight1)

    const glassLight2 = new THREE.PointLight(0x00ffaa, 50, 40)
    glassLight2.position.set(15, 20, -10)
    worldGroup.add(glassLight2)

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.9, metalness: 0.1 })
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 1.0, metalness: 0.0 })
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.3, metalness: 0.9 })
    const glassMat1 = new THREE.MeshBasicMaterial({ color: 0xff0055, transparent: true, opacity: 0.6 })
    const glassMat2 = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.6 })

    const floorGeo1 = new THREE.PlaneGeometry(40, 40)
    const floor1 = new THREE.Mesh(floorGeo1, darkStoneMat)
    floor1.rotation.x = -Math.PI / 2
    floor1.position.set(0, 0, 10)
    floor1.receiveShadow = true
    worldGroup.add(floor1)

    const floorGeo2 = new THREE.PlaneGeometry(40, 100)
    const floor2 = new THREE.Mesh(floorGeo2, darkStoneMat)
    floor2.rotation.x = -Math.PI / 2
    floor2.position.set(0, 0, -60)
    floor2.receiveShadow = true
    worldGroup.add(floor2)

    const zenoAnchorGeo = new THREE.ConeGeometry(0.5, 3, 4)
    const zenoAnchorMat = new THREE.MeshBasicMaterial({ color: 0xffff00 })
    const zenoAnchor = new THREE.Mesh(zenoAnchorGeo, zenoAnchorMat)
    zenoAnchor.position.set(4, 1.5, -8)
    worldGroup.add(zenoAnchor)

    const wallGeo = new THREE.BoxGeometry(2, 60, 200)
    const leftWall = new THREE.Mesh(wallGeo, stoneMat)
    leftWall.position.set(-21, 30, -50)
    leftWall.castShadow = true
    leftWall.receiveShadow = true
    worldGroup.add(leftWall)

    const rightWall = new THREE.Mesh(wallGeo, stoneMat)
    rightWall.position.set(21, 30, -50)
    rightWall.castShadow = true
    rightWall.receiveShadow = true
    worldGroup.add(rightWall)

    const windowGeo = new THREE.PlaneGeometry(10, 30)
    const window1 = new THREE.Mesh(windowGeo, glassMat1)
    window1.position.set(-19.9, 25, -20)
    window1.rotation.y = Math.PI / 2
    worldGroup.add(window1)

    const window2 = new THREE.Mesh(windowGeo, glassMat2)
    window2.position.set(19.9, 25, -20)
    window2.rotation.y = -Math.PI / 2
    worldGroup.add(window2)

    const centralPillarGeo = new THREE.CylinderGeometry(4, 5, 100, 16)
    const centralPillar = new THREE.Mesh(centralPillarGeo, stoneMat)
    centralPillar.position.set(0, 50, -30)
    centralPillar.castShadow = true
    worldGroup.add(centralPillar)

    const stairGeo = new THREE.BoxGeometry(6, 0.5, 2)
    const stairMesh = new THREE.InstancedMesh(stairGeo, stoneMat, 200)
    stairMesh.castShadow = true
    stairMesh.receiveShadow = true
    const dummy = new THREE.Object3D()
    
    for (let i = 0; i < 200; i++) {
      const angle = (i / 20) * Math.PI * 2
      const radius = 7
      const y = i * 0.4
      dummy.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius - 30
      )
      dummy.rotation.y = -angle + Math.PI / 2
      dummy.updateMatrix()
      stairMesh.setMatrixAt(i, dummy.matrix)
    }
    worldGroup.add(stairMesh)

    const gearGroup = new THREE.Group()
    gearGroup.position.set(0, 40, -30)
    
    const gearCoreGeo = new THREE.CylinderGeometry(8, 8, 2, 32)
    const gearCore = new THREE.Mesh(gearCoreGeo, metalMat)
    gearCore.rotation.x = Math.PI / 2
    gearGroup.add(gearCore)

    const toothGeo = new THREE.BoxGeometry(2, 4, 2)
    for (let i = 0; i < 12; i++) {
      const tooth = new THREE.Mesh(toothGeo, metalMat)
      const angle = (i / 12) * Math.PI * 2
      tooth.position.set(Math.cos(angle) * 9, Math.sin(angle) * 9, 0)
      tooth.rotation.z = angle
      gearGroup.add(tooth)
    }
    worldGroup.add(gearGroup)

    const pendulumGroup = new THREE.Group()
    pendulumGroup.position.set(0, 60, -30)
    
    const rodGeo = new THREE.CylinderGeometry(0.2, 0.2, 40, 8)
    const rod = new THREE.Mesh(rodGeo, metalMat)
    rod.position.y = -20
    pendulumGroup.add(rod)

    const bobGeo = new THREE.SphereGeometry(3, 16, 16)
    const bob = new THREE.Mesh(bobGeo, new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 1, roughness: 0.2 }))
    bob.position.y = -40
    pendulumGroup.add(bob)
    worldGroup.add(pendulumGroup)

    const particleCount = 3000
    const particleGeo = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 100
      particlePositions[i * 3 + 1] = Math.random() * 80
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 150 - 20
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0xffddaa,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    const particles = new THREE.Points(particleGeo, particleMat)
    dustGroup.add(particles)

    const velocity = new THREE.Vector3()
    const direction = new THREE.Vector3()
    let moveForward = false
    let moveBackward = false
    let moveLeft = false
    let moveRight = false
    let canJump = false
    
    let shiftingMicro = false
    let shiftingMacro = false
    
    let currentScale = 1
    let targetScale = 1

    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': moveForward = true; break
        case 'KeyA': moveLeft = true; break
        case 'KeyS': moveBackward = true; break
        case 'KeyD': moveRight = true; break
        case 'KeyQ': shiftingMicro = true; break
        case 'KeyE': shiftingMacro = true; break
        case 'Space':
          if (canJump) {
            velocity.y += 25
            canJump = false
          }
          break
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': moveForward = false; break
        case 'KeyA': moveLeft = false; break
        case 'KeyS': moveBackward = false; break
        case 'KeyD': moveRight = false; break
        case 'KeyQ': shiftingMicro = false; break
        case 'KeyE': shiftingMacro = false; break
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)

    const clock = new THREE.Clock()
    let animationId: number

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      const time = clock.getElapsedTime()
      const delta = Math.min(clock.getDelta(), 0.1)

      gearGroup.rotation.z = time * 0.2
      pendulumGroup.rotation.z = Math.sin(time * 0.8) * 0.6
      zenoAnchor.rotation.y = time * 2
      zenoAnchor.scale.setScalar(1 + Math.sin(time * 4) * 0.2)

      const positions = particleGeo.attributes.position.array as Float32Array
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += Math.sin(time + i) * 0.005
      }
      particleGeo.attributes.position.needsUpdate = true

      if (controls.isLocked) {
        if (shiftingMicro) targetScale = Math.max(0.01, targetScale * 0.92)
        if (shiftingMacro) targetScale = Math.min(50, targetScale * 1.08)

        if (Math.abs(currentScale - targetScale) > 0.0001) {
          currentScale += (targetScale - currentScale) * 0.1
          worldGroup.scale.setScalar(currentScale)
        }

        const targetFov = targetScale < 0.5 ? 110 : (targetScale > 2 ? 35 : 70)
        camera.fov += (targetFov - camera.fov) * 0.05
        camera.updateProjectionMatrix()

        const fogDensity = targetScale < 0.5 ? 0.05 : 0.008
        const expFog = scene.fog as THREE.FogExp2
        if (expFog) {
          expFog.density += (fogDensity - expFog.density) * 0.05
        }

        velocity.x -= velocity.x * 10.0 * delta
        velocity.z -= velocity.z * 10.0 * delta
        velocity.y -= 45.0 * delta

        direction.z = Number(moveForward) - Number(moveBackward)
        direction.x = Number(moveRight) - Number(moveLeft)
        direction.normalize()

        if (moveForward || moveBackward) velocity.z -= direction.z * 150.0 * delta
        if (moveLeft || moveRight) velocity.x -= direction.x * 150.0 * delta

        controls.moveRight(-velocity.x * delta)
        controls.moveForward(-velocity.z * delta)

        controls.object.position.y += velocity.y * delta

        if (controls.object.position.y < 1.7) {
          velocity.y = 0
          controls.object.position.y = 1.7
          canJump = true
        }

        if (controls.object.position.y < -50) {
          controls.object.position.set(0, 1.7, 20)
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
      controls.removeEventListener('lock', onLock)
      controls.removeEventListener('unlock', onUnlock)
      cancelAnimationFrame(animationId)
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  const handleClick = () => {
    if (controlsRef.current && !controlsRef.current.isLocked) {
      controlsRef.current.lock()
    }
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="absolute inset-0" />
      {!isLocked && (
        <div 
          onClick={handleClick}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-10 cursor-pointer select-none"
        >
          <h1 className="text-6xl font-bold mb-6 tracking-[0.3em] uppercase text-gray-200">Zeno's Spire</h1>
          <p className="text-xl mb-10 text-gray-400 font-light italic">"To reach the end, you must first cross half the distance."</p>
          <div className="flex flex-col gap-2 text-sm text-gray-500 border border-gray-800 p-6 rounded bg-black/50">
            <p><span className="text-white font-mono">WASD</span> - Traverse the clocktower</p>
            <p><span className="text-white font-mono">SPACE</span> - Leap</p>
            <p><span className="text-white font-mono">Q</span> - Micro Shift (Shrink the world to cross the Zeno Gap)</p>
            <p><span className="text-white font-mono">E</span> - Macro Shift (Grow to see the cathedral)</p>
          </div>
        </div>
      )}
    </div>
  )
}


