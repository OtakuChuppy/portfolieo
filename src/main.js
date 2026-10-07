import {
  animate,
  frame,
  motionValue,
  press,
} from "motion"
import { threeEffect } from "motion/three"
import * as THREE from "three/webgpu"
import {
  attribute,
  cos,
  mix,
  positionLocal,
  sin,
  time,
  uniform,
  vec3,
} from "three/tsl"
/**
 * One Motion value controls one TSL uniform. The uniform drives the
 * position morph for every particle in the material's vertex graph.
 * The same value fades the photograph in once the particles settle.
 */
/* Public hero photo (76 KB WebP) — not bundled, served from dist root. */
const PHOTO_URL = `${import.meta.env.BASE_URL}insta-pp.webp`
const globe = uniform(1)
const globeValue = motionValue(1)

function highResolutionMix(globeAmount) {
  const amount = Math.max(globeAmount, 0)
  const start = 0.005
  const end = 0.035
  const t = Math.min(1, Math.max(0, (amount - start) / (end - start)))
  return 1 - t * t * (3 - 2 * t)
}

const stage = document.querySelector(".stage")
const canvas = document.querySelector(".stage canvas")
const fallbackImg = document.querySelector(".stage-fallback-img")
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
let globeValueTarget = 1
let started = false

if (!stage || !canvas) {
  throw new Error("Hero stage or canvas is missing")
}

// Particle density follows viewport width: fewer on phones, rich on desktop.
function columnsForWidth(width) {
  if (width < 560) return 90
  if (width < 900) return 130
  if (width < 1400) return 170
  return 200
}

function showFallback(message) {
  stage.classList.add("is-fallback")
  if (fallbackImg) fallbackImg.hidden = false
  const hint = stage.querySelector(".stage-hint")
  if (hint) hint.textContent = message
  canvas.dataset.ready = "fallback"
}

function setGlobeTarget(value, spring) {
  globeValueTarget = value
  animate(globeValue, value, spring)
}

function runParticleMotion(photoMesh) {
  threeEffect(globe, { value: globeValue })

  const introSpring = {
    type: "spring",
    stiffness: 38,
    damping: 12.5,
    mass: 1.15,
    delay: 0.9,
  }
  const holdSpring = {
    type: "spring",
    stiffness: 120,
    damping: 18,
    mass: 0.9,
  }
  const releaseSpring = {
    type: "spring",
    stiffness: 70,
    damping: 16,
    mass: 1,
  }

  if (reducedMotion) {
    globeValue.set(0)
    globe.value = 0
    photoMesh.material.opacity = 1
  } else {
    animate(globeValue, 0, introSpring)
  }

  // Opacity follows the globe value directly every frame — no dead pipe.
  // Initial delay lets the globe→photo morph read on first load before
  // the photo plane fades in (same curve, gated by introElapsed).
  let introElapsed = false
  const syncOpacity = () => {
    if (!introElapsed && globeValueTarget === 1) {
      photoMesh.material.opacity = 0
      return
    }
    photoMesh.material.opacity = highResolutionMix(globeValue.get())
  }
  setTimeout(() => {
    introElapsed = true
    syncOpacity()
  }, 1600)
  globeValue.on("change", syncOpacity)
  syncOpacity()

  const hold = () => setGlobeTarget(1, holdSpring)
  const release = () => setGlobeTarget(0, releaseSpring)

  press(canvas, () => {
    hold()

    return release
  })

  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (globeValueTarget === 1) release()
      else hold()
    }
  })
  canvas.addEventListener("blur", release)
}

function loadPhoto(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      // Downscale huge photos before sampling: keeps the GPU load sane
      // while preserving colours for the particles.
      const MAX_SIDE = 900
      const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
      const width = Math.max(1, Math.round(image.naturalWidth * scale))
      const height = Math.max(1, Math.round(image.naturalHeight * scale))
      const source = document.createElement("canvas")
      source.width = width
      source.height = height

      const context = source.getContext("2d", {
        willReadFrequently: true,
      })
      if (!context) {
        reject(new Error("2D canvas is not available"))
        return
      }
      context.drawImage(image, 0, 0, width, height)

      const map = new THREE.Texture(image)
      map.colorSpace = THREE.SRGBColorSpace
      map.needsUpdate = true

      resolve({
        width: source.width,
        height: source.height,
        pixels: context.getImageData(
          0,
          0,
          source.width,
          source.height
        ).data,
        map,
      })
    }

    image.onerror = () => reject(
      new Error("Could not load the photograph")
    )
    image.src = url
  })
}

function createParticles(photo, columns) {
  const imageAspect = photo.width / photo.height
  const rows = Math.max(1, Math.round(columns / imageAspect))
  const count = columns * rows
  const imagePositions = new Float32Array(count * 3)
  const globePositions = new Float32Array(count * 3)
  const colours = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const speeds = new Float32Array(count)
  const colour = new THREE.Color()

  for (let index = 0; index < count; index++) {
    const column = index % columns
    const row = Math.floor(index / columns)
    const sampleX = Math.min(
      photo.width - 1,
      Math.floor((column + 0.5) / columns * photo.width)
    )
    const sampleY = Math.min(
      photo.height - 1,
      Math.floor((row + 0.5) / rows * photo.height)
    )
    const pixel = (sampleY * photo.width + sampleX) * 4
    const offset = index * 3

    colour.setRGB(
      photo.pixels[pixel] / 255,
      photo.pixels[pixel + 1] / 255,
      photo.pixels[pixel + 2] / 255,
      THREE.SRGBColorSpace
    )
    colours[offset] = colour.r
    colours[offset + 1] = colour.g
    colours[offset + 2] = colour.b
    phases[index] = Math.random() * Math.PI * 2
    speeds[index] = 0.7 + Math.random() * 0.35
  }

  const geometry = new THREE.InstancedBufferGeometry()
  const plane = new THREE.PlaneGeometry(1, 1)
  geometry.index = plane.index
  geometry.setAttribute("position", plane.getAttribute("position"))
  geometry.setAttribute("uv", plane.getAttribute("uv"))
  geometry.instanceCount = count
  geometry.setAttribute(
    "imagePosition",
    new THREE.InstancedBufferAttribute(imagePositions, 3)
  )
  geometry.setAttribute(
    "globePosition",
    new THREE.InstancedBufferAttribute(globePositions, 3)
  )
  geometry.setAttribute(
    "colour",
    new THREE.InstancedBufferAttribute(colours, 3)
  )
  geometry.setAttribute(
    "phase",
    new THREE.InstancedBufferAttribute(phases, 1)
  )
  geometry.setAttribute(
    "speed",
    new THREE.InstancedBufferAttribute(speeds, 1)
  )

  const imagePosition = attribute("imagePosition")
  const spherePosition = attribute("globePosition")
  const phase = attribute("phase")
  const speed = attribute("speed")
  const particleSize = uniform(new THREE.Vector2(0.01, 0.01))
  const turbulence = vec3(
    sin(time.mul(speed.add(0.6)).add(phase)).mul(0.045),
    cos(
      time.mul(speed.add(0.37)).add(phase.mul(1.71))
    ).mul(0.035),
    sin(
      time.mul(speed.add(0.22)).add(phase.mul(2.13))
    ).mul(0.045)
  )
  const material = new THREE.MeshBasicNodeMaterial({
    toneMapped: false,
  })

  material.colorNode = attribute("colour")
  const particleCenter = mix(
    imagePosition,
    spherePosition.add(turbulence),
    globe
  )
  material.positionNode = particleCenter.add(
    vec3(positionLocal.xy.mul(particleSize), 0)
  )

  return {
    imageAspect,
    columns,
    rows,
    particleSize,
    object: (() => {
      const mesh = new THREE.Mesh(geometry, material)
      // Instanced positions live in the shader — never cull the mesh.
      mesh.frustumCulled = false
      return mesh
    })(),
  }
}

function createPhotoOverlay(photo) {
  const photoMaterial = new THREE.MeshBasicMaterial({
    map: photo.map,
    toneMapped: false,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    opacity: 0,
  })

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    photoMaterial
  )
  mesh.renderOrder = 1
  mesh.frustumCulled = false
  return mesh
}

function layoutParticles(particles, photoMesh, aspect, globeYaw) {
  const {
    columns,
    imageAspect,
    object,
    particleSize,
    rows,
  } = particles
  // All sizes are fractions of the half-view (0..1), so they scale
  // with the vw/vh-sized stage instead of fixed pixels.
  const imageHalfHeight = Math.min(
    0.72,
    0.86 * aspect / imageAspect
  )
  const imageHalfWidth = imageHalfHeight * imageAspect
  const globeRadius = Math.min(0.58, aspect * 0.82)
  const position = object.geometry.getAttribute("imagePosition")
  const sphere = object.geometry.getAttribute("globePosition")
  const yawCos = Math.cos(globeYaw)
  const yawSin = Math.sin(globeYaw)
  const tilt = -0.28

  for (let index = 0; index < position.count; index++) {
    const column = index % columns
    const row = Math.floor(index / columns)
    const x = (column + 0.5) / columns
    const y = (row + 0.5) / rows
    const sphereY = 1 - index / Math.max(position.count - 1, 1) * 2
    const ringRadius = Math.sqrt(
      Math.max(0, 1 - sphereY * sphereY)
    )
    const angle = index * 2.39996323
    const sphereX = Math.cos(angle) * ringRadius
    const sphereZ = Math.sin(angle) * ringRadius
    const spunX = sphereX * yawCos + sphereZ * yawSin
    const spunZ = -sphereX * yawSin + sphereZ * yawCos

    position.setXYZ(
      index,
      (x - 0.5) * imageHalfWidth * 2,
      (0.5 - y) * imageHalfHeight * 2,
      0
    )
    sphere.setXYZ(
      index,
      spunX * globeRadius,
      (
        sphereY * Math.cos(tilt) -
        spunZ * Math.sin(tilt)
      ) * globeRadius,
      (
        sphereY * Math.sin(tilt) +
        spunZ * Math.cos(tilt)
      ) * globeRadius
    )
  }

  position.needsUpdate = true
  sphere.needsUpdate = true
  particleSize.value.set(
    imageHalfWidth * 2 / columns * 1.01,
    imageHalfHeight * 2 / rows * 1.01
  )
  photoMesh.scale.set(
    imageHalfWidth * 2,
    imageHalfHeight * 2,
    1
  )
}

async function start() {
  if (started) return
  started = true

  if (!("gpu" in navigator)) {
    showFallback("3D globe isn't supported in this browser — showing the portrait instead.")
    return
  }

  let renderer
  try {
    renderer = new THREE.WebGPURenderer({
      canvas,
      antialias: true,
    })
    await renderer.init()
  } catch (error) {
    console.error(error)
    showFallback("WebGPU failed to start — showing the portrait instead.")
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  let photo
  try {
    photo = await loadPhoto(PHOTO_URL)
  } catch (error) {
    console.error(error)
    showFallback("Could not load the portrait — showing the photo instead.")
    return
  }

  const globeYaw = Math.random() * Math.PI * 2
  const columns = columnsForWidth(Math.max(stage.clientWidth, 1))
  const particles = createParticles(photo, columns)
  const photoMesh = createPhotoOverlay(photo)
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)

  scene.background = new THREE.Color(0x000000)
  camera.position.z = 4
  scene.add(particles.object)
  scene.add(photoMesh)

  const resize = () => {
    const width = Math.max(stage.clientWidth, 1)
    const height = Math.max(stage.clientHeight, 1)
    const aspect = width / height
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    renderer.setPixelRatio(dpr)
    // false = don't touch CSS size; vw/vh CSS owns width/height.
    renderer.setSize(width, height, false)
    camera.left = -aspect
    camera.right = aspect
    camera.top = 1
    camera.bottom = -1
    camera.updateProjectionMatrix()
    layoutParticles(particles, photoMesh, aspect, globeYaw)
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(stage)
  window.addEventListener("orientationchange", resize)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) resize()
  })
  resize()
  runParticleMotion(photoMesh)
  canvas.dataset.ready = "true"
  frame.render(() => renderer.render(scene, camera), true)
}

start().catch((error) => {
  console.error(error)
  showFallback("Something went wrong loading the 3D effect — showing the portrait instead.")
})

import { getSiteContent } from "./siteContent.js"
import { applyTracking } from "./tracking.js"
applyTracking(getSiteContent().tracking)
