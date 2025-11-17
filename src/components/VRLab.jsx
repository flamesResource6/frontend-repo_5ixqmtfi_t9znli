import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { XRButton } from 'three/examples/jsm/webxr/XRButton.js'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Simple in-app state persistence using localStorage
const store = {
  get: (k, d) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d }
  },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
}

function makePanel(text, position) {
  const group = new THREE.Group()
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.6, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.18 })
  )
  const border = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.6, 64),
    new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.8 })
  )
  plane.position.z = 0
  border.rotation.x = Math.PI
  const canvas = document.createElement('canvas')
  canvas.width = 1024; canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(14,165,233,0.15)'; ctx.fillRect(0,0,1024,512)
  ctx.fillStyle = '#e2f9ff'; ctx.font = 'bold 42px Inter, sans-serif'; ctx.fillText(text, 40, 90)
  const tex = new THREE.CanvasTexture(canvas)
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.58), new THREE.MeshBasicMaterial({ map: tex, transparent: true }))
  label.position.z = 0.01
  group.add(plane, label)
  group.position.copy(position)
  group.lookAt(0, 1.6, 0)
  return group
}

export default function VRLab() {
  const containerRef = useRef(null)
  const [quality, setQuality] = useState(() => store.get('quality', 'medium'))
  const [xp, setXp] = useState(() => store.get('xp', 0))
  const [badges, setBadges] = useState(() => store.get('badges', []))
  const [missions, setMissions] = useState(() => store.get('missions', {
    spill: { accepted: false, done: false },
    pendulum: { accepted: false, done: false },
    circuit: { accepted: false, done: false }
  }))

  useEffect(() => { store.set('quality', quality) }, [quality])
  useEffect(() => { store.set('xp', xp) }, [xp])
  useEffect(() => { store.set('badges', badges) }, [badges])
  useEffect(() => { store.set('missions', missions) }, [missions])

  useEffect(() => {
    const container = containerRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1020)

    const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.01, 100)
    camera.position.set(0, 1.6, 3)

    const renderer = new THREE.WebGLRenderer({ antialias: quality !== 'low', alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.5))
    renderer.xr.enabled = true
    container.appendChild(renderer.domElement)

    // VR button (fallbacks automatically to inline magic window if XR unavailable)
    const btn = VRButton.createButton(renderer)
    btn.style.position = 'absolute'; btn.style.top = '16px'; btn.style.left = '16px'
    container.appendChild(btn)

    // Lighting
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223366, 0.6)
    scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(5, 10, 2)
    dir.castShadow = quality === 'high'
    scene.add(dir)

    // Floor
    const floor = new THREE.Mesh(new THREE.CircleGeometry(20, 48), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.2, roughness: 0.8 }))
    floor.rotation.x = -Math.PI/2
    floor.receiveShadow = true
    scene.add(floor)

    // Lab walls simple
    const room = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 16), new THREE.MeshStandardMaterial({ color: 0x0b1220, side: THREE.BackSide, metalness: 0.1, roughness: 0.9 }))
    room.position.y = 2
    scene.add(room)

    // Benches
    function bench(x, z) {
      const g = new THREE.Group()
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1), new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.3, roughness: 0.6 }))
      top.position.y = 0.9
      const legMat = new THREE.MeshStandardMaterial({ color: 0x334155 })
      for (let i of [[-1,0.4], [1,0.4], [-1,-0.4], [1,-0.4]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 16), legMat)
        leg.position.set(i[0]*0.9, 0.45, i[1])
        g.add(leg)
      }
      g.add(top)
      g.position.set(x,0,z)
      scene.add(g)
      return g
    }

    const benchPhysics = bench(-3, -2)
    const benchChem = bench(0, -2)
    const benchAI = bench(3, -2)

    // Panels labels
    scene.add(makePanel('Physics Station', new THREE.Vector3(-3, 1.6, -1.2)))
    scene.add(makePanel('Chemistry Station', new THREE.Vector3(0, 1.6, -1.2)))
    scene.add(makePanel('AI Station', new THREE.Vector3(3, 1.6, -1.2)))

    // Simple teleportation markers
    const tpMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 })
    const tps = [new THREE.Vector3(-3,0.01,-1.2), new THREE.Vector3(0,0.01,-1.2), new THREE.Vector3(3,0.01,-1.2)]
      .map(p => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), tpMat); m.rotation.x = -Math.PI/2; m.position.copy(p); scene.add(m); return m })

    // Controller/gaze teleport
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    function onClick(ev){
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(tps)
      if (hits[0]) {
        const p = hits[0].object.position
        camera.position.set(p.x, 1.6, p.z + 1.2)
      }
    }
    renderer.domElement.addEventListener('click', onClick)

    // Physics: Pendulum
    const pivot = new THREE.Group(); pivot.position.set(-3, 2.2, -2)
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 24), new THREE.MeshStandardMaterial({ color: 0x60a5fa, metalness: 0.6, roughness: 0.2 }))
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0x64748b }))
    rod.position.y = -0.6
    bob.position.y = -1.2
    pivot.add(rod); pivot.add(bob); scene.add(pivot)
    let theta = 0.5, omega = 0, L = 1.2, g = 9.81
    function stepPendulum(dt){
      const alpha = -(g/L) * Math.sin(theta)
      omega += alpha * dt
      theta += omega * dt
      pivot.rotation.z = theta
    }

    // Projectile launcher
    const launcher = new THREE.Group(); launcher.position.set(-3, 0.9, -1.6)
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.6,16), new THREE.MeshStandardMaterial({ color: 0xf97316 }))
    barrel.rotation.z = Math.PI/2; barrel.position.y = 0.2
    launcher.add(barrel); scene.add(launcher)
    const projectiles = []
    function fire(){
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), new THREE.MeshStandardMaterial({ color: 0x22d3ee }))
      const start = new THREE.Vector3().setFromMatrixPosition(barrel.matrixWorld)
      b.position.copy(start)
      const v = new THREE.Vector3(1, 0.4, 0).applyEuler(launcher.rotation).multiplyScalar(3)
      projectiles.push({ mesh: b, v })
      scene.add(b)
    }

    // Collisions area
    const colliders = []
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshStandardMaterial({ color: 0x0a0f1f, side: THREE.DoubleSide }))
    ground.rotation.x = -Math.PI/2; ground.position.set(-3,0.01,-0.8); scene.add(ground)
    function spawnBody(){
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.15,0.15), new THREE.MeshStandardMaterial({ color: 0x34d399 }))
      cube.position.set(-3 + (Math.random()-0.5)*0.8, 1.4, -0.8 + (Math.random()-0.5)*0.8)
      colliders.push({ mesh: cube, v: new THREE.Vector3(0,0,0) })
      scene.add(cube)
    }

    // Chemistry station: beakers and mixing
    const beakerA = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.25, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0, transmission: 0.9, transparent: true, opacity: 0.6 }))
    beakerA.position.set(0, 0.95, -2)
    const beakerB = beakerA.clone(); beakerB.position.x = 0.3
    const liquidA = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.13,0.16,24), new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent:true, opacity:0.6 }))
    const liquidB = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.13,0.08,24), new THREE.MeshStandardMaterial({ color: 0x10b981, transparent:true, opacity:0.6 }))
    liquidA.position.set(0,0.9,-2)
    liquidB.position.set(0.3,0.91,-2)
    scene.add(beakerA, beakerB, liquidA, liquidB)

    let gogglesOn = false
    const safetyText = makePanel('Toggle Safety Goggles (G) before mixing', new THREE.Vector3(0,1.7,-1.4))
    scene.add(safetyText)

    function mixLiquids(){
      if(!gogglesOn){
        alert('Put on safety goggles first (press G).')
        return
      }
      // Simple reaction visual: bubbles and color change
      const bubbles = new THREE.Group();
      const count = quality === 'high' ? 120 : quality === 'low' ? 30 : 60
      for(let i=0;i<count;i++){
        const s = Math.random()*0.02+0.01
        const p = new THREE.Mesh(new THREE.SphereGeometry(s,8,8), new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e }))
        p.position.set(0.15 + (Math.random()-0.5)*0.2, 0.9 + Math.random()*0.15, -2)
        bubbles.add(p)
      }
      scene.add(bubbles)
      setTimeout(()=> scene.remove(bubbles), 3000)
      // change liquid color as reaction result
      liquidA.material.color.set(0xf43f5e)
      liquidB.material.color.set(0xf43f5e)
      // Grant XP and badge for safe mixing
      setXp(x => x+50)
      setBadges(b => Array.from(new Set([...b, 'Chemistry Novice'])))
      setMissions(m => ({ ...m, spill: { ...m.spill, done: true } }))
      showFloatingText('Reaction: HCl + NaOH -> NaCl + H2O\nApplication: Neutralization', new THREE.Vector3(0,1.8,-1.6))
    }

    function showFloatingText(text, pos){
      const group = makePanel(text, pos)
      scene.add(group)
      setTimeout(()=> scene.remove(group), 5000)
    }

    // Circuit bench simplified: connect battery to resistor to bulb
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.05,0.5), new THREE.MeshStandardMaterial({ color: 0x111827 }))
    board.position.set(3, 1.0, -2); scene.add(board)
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16,16), new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x000000 }))
    bulb.position.set(3.2, 1.08, -2)
    const battery = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.12,16), new THREE.MeshStandardMaterial({ color: 0x93c5fd }))
    battery.position.set(2.8,1.06,-2)
    const resistor = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.05,0.04), new THREE.MeshStandardMaterial({ color: 0x14b8a6 }))
    resistor.position.set(3.0,1.06,-2)
    scene.add(bulb,battery,resistor)

    let circuitBuilt = false
    function buildCircuit(){
      circuitBuilt = true
      bulb.material.emissive.setHex(0xf59e0b)
      setXp(x => x+70)
      setBadges(b => Array.from(new Set([...b, 'Circuit Fixer'])))
      setMissions(m => ({ ...m, circuit: { ...m.circuit, done: true } }))
      showFloatingText('Circuit Complete! Current flowing.', new THREE.Vector3(3,1.7,-1.6))
    }

    // UI overlays using DOM for simplicity
    const ui = document.createElement('div')
    ui.style.position = 'absolute'; ui.style.right = '16px'; ui.style.top = '16px'; ui.style.display='flex'; ui.style.flexDirection='column'; ui.style.gap='8px'
    ui.innerHTML = `
      <div style="backdrop-filter: blur(8px); background: rgba(15,23,42,0.5); padding: 12px 14px; border-radius: 12px; color: #e2e8f0; font-family: Inter, system-ui; min-width: 240px;">
        <div style="font-weight:700; margin-bottom:8px;">Mission Board</div>
        <button id="m-spill" style="margin:4px 0; width:100%">Neutralize a Spill</button>
        <button id="m-pendulum" style="margin:4px 0; width:100%">Stabilize the Pendulum</button>
        <button id="m-circuit" style="margin:4px 0; width:100%">Repair the Circuit</button>
      </div>
      <div style="backdrop-filter: blur(8px); background: rgba(15,23,42,0.5); padding: 12px 14px; border-radius: 12px; color: #e2e8f0; font-family: Inter;">
        <div>XP: <strong id="xp">${xp}</strong></div>
        <div>Badges: <span id="badges">${badges.join(', ') || 'None'}</span></div>
        <div style="margin-top:6px">Quality:
          <select id="qual">
            <option value="low" ${quality==='low'?'selected':''}>Low</option>
            <option value="medium" ${quality==='medium'?'selected':''}>Medium</option>
            <option value="high" ${quality==='high'?'selected':''}>High</option>
          </select>
        </div>
        <div style="margin-top:6px">Goggles: <strong id="goggles">${gogglesOn? 'ON':'OFF'}</strong> (press G)</div>
        <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap">
          <button id="fire">Fire Projectile</button>
          <button id="spawn">Spawn Body</button>
          <button id="mix">Mix</button>
          <button id="circuit">Build Circuit</button>
          <button id="reset">Reset</button>
        </div>
      </div>
    `
    container.appendChild(ui)
    ui.querySelector('#qual').addEventListener('change', (e)=> setQuality(e.target.value))
    ui.querySelector('#fire').addEventListener('click', fire)
    ui.querySelector('#spawn').addEventListener('click', spawnBody)
    ui.querySelector('#mix').addEventListener('click', mixLiquids)
    ui.querySelector('#circuit').addEventListener('click', buildCircuit)
    ui.querySelector('#reset').addEventListener('click', ()=> window.location.reload())

    function acceptMission(key){ setMissions(m=> ({...m, [key]: { ...m[key], accepted: true }})) }
    ui.querySelector('#m-spill').addEventListener('click', ()=> acceptMission('spill'))
    ui.querySelector('#m-pendulum').addEventListener('click', ()=> acceptMission('pendulum'))
    ui.querySelector('#m-circuit').addEventListener('click', ()=> acceptMission('circuit'))

    // AI Station: simple TF.js MobileNet classification via script tag when needed
    let tfLoaded = false
    async function ensureTF(){
      if(tfLoaded) return
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js')
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1')
      tfLoaded = true
    }
    async function runAI(){
      try{
        await ensureTF()
        const img = new Image(); img.crossOrigin = 'anonymous'
        img.src = 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=512&q=60'
        await new Promise(r=> img.onload = r)
        // @ts-ignore
        const model = await mobilenet.load()
        const preds = await model.classify(img)
        const text = preds.map(p=> `${p.className} (${(p.probability*100).toFixed(1)}%)`).join('\n')
        showFloatingText('AI Prediction:\n'+text, new THREE.Vector3(3,1.9,-1.6))
        setXp(x=> x+60)
      }catch(e){
        alert('AI error: '+e.message)
      }
    }

    const aiBtn = document.createElement('button'); aiBtn.textContent = 'Run AI Demo'; aiBtn.style.marginTop='8px'; ui.lastElementChild.appendChild(aiBtn)
    aiBtn.addEventListener('click', runAI)

    function loadScript(src){
      return new Promise((res, rej)=>{ const s = document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=> rej(new Error('Failed '+src)); document.body.appendChild(s) })
    }

    // Progress terminal panel in scene
    const progressPanel = makePanel('Progress Terminal\nView your XP and badges here.', new THREE.Vector3(1.2,1.6,1.2))
    scene.add(progressPanel)

    // Keyboard controls
    function onKey(e){
      if(e.key.toLowerCase()==='g'){ gogglesOn = !gogglesOn; const el = ui.querySelector('#goggles'); el.textContent = gogglesOn? 'ON':'OFF' }
      if(e.key===' '){ fire() }
    }
    window.addEventListener('keydown', onKey)

    // Resize
    function onResize(){
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // Animation loop
    const clock = new THREE.Clock()
    renderer.setAnimationLoop(()=>{
      const dt = Math.min(0.033, clock.getDelta())
      stepPendulum(dt)

      // projectiles
      for(let p of projectiles){
        p.v.y -= 9.81 * dt
        p.mesh.position.addScaledVector(p.v, dt)
        if(p.mesh.position.y < 0){ p.v.y *= -0.6; p.mesh.position.y = 0.01 }
      }

      // simple gravity for colliders
      for(let c of colliders){
        c.v.y -= 9.81*dt
        c.mesh.position.addScaledVector(c.v, dt)
        if(c.mesh.position.y < 0.075){ c.mesh.position.y = 0.075; c.v.y *= -0.4 }
      }

      renderer.render(scene, camera)
    })

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
      renderer.domElement.removeEventListener('click', onClick)
      container.removeChild(renderer.domElement)
      if(btn && btn.parentElement===container) container.removeChild(btn)
      if(ui && ui.parentElement===container) container.removeChild(ui)
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-900">
      <div ref={containerRef} className="relative h-[100vh] w-full" />
    </div>
  )
}
