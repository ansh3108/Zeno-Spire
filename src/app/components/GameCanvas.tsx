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
    scene.background = new THREE.Color(0x0a0a0c)
    scene.fog = new THREE.FogExp2(0x0a0a0c, 0.015)

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.0001, 1000000)
    camera.position.y = 1.7

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mountRef.current.appendChild(renderer.domElement)

    const controls = new PointerLockControls(camera, renderer.domElement)
    controlsRef.current = controls

    const onLock = () => setIsLocked(true)
    const onUnlock = () => setIsLocked(false)
    controls.addEventListener('lock', onLock)
    controls.addEventListener('unlock', onUnlock)

    scene.add(controls.object)

    const hemiLight = new THREE.HemisphereLight(0x444466, 0x111122, 0.5)
    scene.add(hemiLight)

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.5)
    dirLight.position.set(50, 100, 50)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 500
    dirLight.shadow.camera.left = -100
    dirLight.shadow.camera.right = 100
    dirLight.shadow.camera.top = 100
    dirLight.shadow.camera.bottom = -100
    scene.add(dirLight)

    const floorGeo = new THREE.PlaneGeometry(2000, 2000)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.2 })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.6, metalness: 0.4 })
    
    for (let i = 0; i < 30; i++) {
      const height = Math.random() * 120 + 20
      const radius = Math.random() * 4 + 2
      const geo = new THREE.CylinderGeometry(radius, radius, height, 8)
      const pillar = new THREE.Mesh(geo, pillarMat)
      pillar.position.set(
        (Math.random() - 0.5) * 300,
        height / 2,
        (Math.random() - 0.5) * 300
      )
      pillar.castShadow = true
      pillar.receiveShadow = true
      scene.add(pillar)
    }

    const spireBaseGeo = new THREE.BoxGeometry(30, 400, 30)
    const spireBaseMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.4, metalness: 0.6 })
    const spireBase = new THREE.Mesh(spireBaseGeo, spireBaseMat)
    spireBase.position.set(0, 200, -60)
    spireBase.castShadow = true
    spireBase.receiveShadow = true
    scene.add(spireBase)

    const velocity = new THREE.Vector3()
    const direction = new THREE.Vector3()
    let moveForward = false
    let moveBackward = false
    let moveLeft = false
    let moveRight = false
    let canJump = false

    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': moveForward = true; break
        case 'KeyA': moveLeft = true; break
        case 'KeyS': moveBackward = true; break
        case 'KeyD': moveRight = true; break
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
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)

    const clock = new THREE.Clock()
    let animationId: number

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      if (controls.isLocked) {
        const delta = Math.min(clock.getDelta(), 0.1)

        velocity.x -= velocity.x * 10.0 * delta
        velocity.z -= velocity.z * 10.0 * delta
        velocity.y -= 45.0 * delta

        direction.z = Number(moveForward) - Number(moveBackward)
        direction.x = Number(moveRight) - Number(moveLeft)
        direction.normalize()

        if (moveForward || moveBackward) velocity.z -= direction.z * 200.0 * delta
        if (moveLeft || moveRight) velocity.x -= direction.x * 200.0 * delta

        controls.moveRight(-velocity.x * delta)
        controls.moveForward(-velocity.z * delta)

        controls.object.position.y += velocity.y * delta

        if (controls.object.position.y < 1.7) {
          velocity.y = 0
          controls.object.position.y = 1.7
          canJump = true
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
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10 cursor-pointer select-none"
        >
          <h1 className="text-5xl font-bold mb-4 tracking-widest uppercase">Zeno's Spire</h1>
          <p className="text-lg mb-8 text-gray-400">Click to enter the clocktower</p>
          <p className="text-sm text-gray-500">WASD to move | SPACE to jump | ESC to pause</p>
        </div>
      )}
    </div>
  )
}


