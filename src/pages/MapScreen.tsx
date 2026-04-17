import { useRef, useCallback, useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { StarsBackground } from '../components/StarsBackground'
import { MapPin } from '../components/MapPin'
import { PINS } from '../data/pins'
import styles from './MapScreen.module.css'

const SPB_CENTER: [number, number] = [59.9343, 30.3351]
const MAP_ZOOM = 13
const MIN_ZOOM = 11
const MAX_ZOOM = 18
const EXPAND_ZOOM = 15        // Leaflet zoom at which pins expand
const EXPAND_DELAY = 200
const WHEEL_ZOOM_SPEED = 0.004
const ROTATION_WHEEL_SENSITIVITY = 0.3
const LERP_SPEED = 0.12

/* ---- Expose map instance to parent via ref ---- */
function MapRefGrabber({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  return null
}

/* ---- Watch Leaflet zoom and fire expand callback ---- */
function ZoomWatcher({ onExpandChange }: { onExpandChange: (v: boolean) => void }) {
  const map = useMap()
  const timerRef = useRef(0)
  useEffect(() => {
    const check = () => {
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        onExpandChange(map.getZoom() >= EXPAND_ZOOM)
      }, EXPAND_DELAY)
    }
    map.on('zoom', check)
    map.on('zoomend', check)
    // initial
    check()
    return () => { map.off('zoom', check); map.off('zoomend', check) }
  }, [map, onExpandChange])
  return null
}

export function MapScreen() {
  const screenRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  /* ---- rotation state (CSS only, no Leaflet involvement) ---- */
  const rotationRef = useRef(0)
  const targetRotationRef = useRef(0)
  const rafRef = useRef(0)
  const animatingRef = useRef(false)

  /* ---- pin expansion ---- */
  const [pinsExpanded, setPinsExpanded] = useState(false)
  const handleExpandChange = useCallback((v: boolean) => setPinsExpanded(v), [])

  /* ---- pinch gesture state ---- */
  const pinchRef = useRef({ startDist: 0, startZoom: MAP_ZOOM, startAngle: 0, startRotation: 0 })

  /* ---- drag state (single-finger / mouse, rotation-compensated) ---- */
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 })

  /* ---- apply rotation to scene + CSS var for pin counter-rotation ---- */
  const applyRotation = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.style.transform = `rotate(${rotationRef.current}deg)`
    }
    if (screenRef.current) {
      screenRef.current.style.setProperty('--scene-rotation', String(rotationRef.current))
    }
  }, [])

  /* ---- lerp animation for smooth rotation ---- */
  const animateRotation = useCallback(() => {
    const diff = targetRotationRef.current - rotationRef.current
    if (Math.abs(diff) < 0.05) {
      rotationRef.current = targetRotationRef.current
      applyRotation()
      animatingRef.current = false
      return
    }
    rotationRef.current += diff * LERP_SPEED
    applyRotation()
    rafRef.current = requestAnimationFrame(animateRotation)
  }, [applyRotation])

  const startRotation = useCallback(() => {
    if (!animatingRef.current) {
      animatingRef.current = true
      rafRef.current = requestAnimationFrame(animateRotation)
    }
  }, [animateRotation])

  /* ---- helper: compensate drag delta for scene rotation ---- */
  const panCompensated = useCallback((dx: number, dy: number) => {
    const map = mapRef.current
    if (!map) return
    const rad = -rotationRef.current * Math.PI / 180
    const mx = dx * Math.cos(rad) - dy * Math.sin(rad)
    const my = dx * Math.sin(rad) + dy * Math.cos(rad)
    map.panBy([-mx, -my], { animate: false })
  }, [])

  /* ---- main event listeners ---- */
  useEffect(() => {
    applyRotation()
    const el = screenRef.current
    if (!el) return

    /* ---- wheel: normal → Leaflet zoom, shift → rotation ---- */
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.shiftKey) {
        targetRotationRef.current += (e.deltaY || e.deltaX) * ROTATION_WHEEL_SENSITIVITY
        startRotation()
      } else {
        const map = mapRef.current
        if (!map) return
        const delta = -e.deltaY * WHEEL_ZOOM_SPEED
        const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, map.getZoom() + delta))
        map.setZoom(z, { animate: false })
      }
    }

    /* ---- touch helpers ---- */
    const getTouchDist = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]]
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    }
    const getTouchAngle = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]]
      return Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * (180 / Math.PI)
    }

    /* ---- touch start ---- */
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const map = mapRef.current
        pinchRef.current = {
          startDist: getTouchDist(e),
          startZoom: map?.getZoom() ?? MAP_ZOOM,
          startAngle: getTouchAngle(e),
          startRotation: rotationRef.current,
        }
        dragRef.current.active = false
      } else if (e.touches.length === 1) {
        dragRef.current = { active: true, lastX: e.touches[0].clientX, lastY: e.touches[0].clientY }
      }
    }

    /* ---- touch move: 2-finger → pinch zoom + rotate, 1-finger → drag ---- */
    const onTouchMove = (e: TouchEvent) => {
      const map = mapRef.current
      if (!map) return
      if (e.touches.length === 2) {
        e.preventDefault()
        /* zoom */
        const dist = getTouchDist(e)
        const ratio = dist / pinchRef.current.startDist
        const zoomDelta = Math.log2(ratio)
        const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.startZoom + zoomDelta))
        map.setZoom(z, { animate: false })
        /* rotation */
        const angleDelta = getTouchAngle(e) - pinchRef.current.startAngle
        rotationRef.current = pinchRef.current.startRotation + angleDelta
        targetRotationRef.current = rotationRef.current
        applyRotation()
      } else if (e.touches.length === 1 && dragRef.current.active) {
        e.preventDefault()
        const dx = e.touches[0].clientX - dragRef.current.lastX
        const dy = e.touches[0].clientY - dragRef.current.lastY
        dragRef.current.lastX = e.touches[0].clientX
        dragRef.current.lastY = e.touches[0].clientY
        panCompensated(dx, dy)
      }
    }

    const onTouchEnd = () => { dragRef.current.active = false }

    /* ---- mouse drag (desktop) with rotation compensation ---- */
    let mDrag = { active: false, lastX: 0, lastY: 0 }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      const t = e.target as HTMLElement
      if (t.closest(`.${styles.topBar}`) || t.closest(`.${styles.bottomCenter}`)) return
      mDrag = { active: true, lastX: e.clientX, lastY: e.clientY }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!mDrag.active) return
      const dx = e.clientX - mDrag.lastX
      const dy = e.clientY - mDrag.lastY
      mDrag.lastX = e.clientX
      mDrag.lastY = e.clientY
      panCompensated(dx, dy)
    }
    const onMouseUp = () => { mDrag.active = false }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseup', onMouseUp)
    el.addEventListener('mouseleave', onMouseUp)

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('mouseleave', onMouseUp)
      cancelAnimationFrame(rafRef.current)
    }
  }, [applyRotation, startRotation, panCompensated])

  const handleRecenter = useCallback(() => {
    targetRotationRef.current = 0
    startRotation()
    mapRef.current?.flyTo(SPB_CENTER, MAP_ZOOM, { duration: 0.5 })
  }, [startRotation])

  return (
    <div className={styles.screen} ref={screenRef}>
      <StarsBackground starCount={350} />
      <div className={styles.scene} ref={sceneRef}>
        <div className={styles.glow} />
        <div className={styles.circleWrap}>
          <MapContainer
            center={SPB_CENTER}
            zoom={MAP_ZOOM}
            zoomControl={false}
            attributionControl={false}
            className={styles.map}
            scrollWheelZoom={false}
            touchZoom={false}
            doubleClickZoom={false}
            dragging={false}
            zoomSnap={0}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              keepBuffer={4}
            />
            <MapRefGrabber mapRef={mapRef} />
            <ZoomWatcher onExpandChange={handleExpandChange} />
            {PINS.map(pin => (
              <MapPin
                key={pin.id}
                pin={pin}
                expanded={pinsExpanded}
              />
            ))}
          </MapContainer>
        </div>
      </div>

      <div className={styles.topBar}>
        <div className={styles.cityName}>санкт-<br/>петербург</div>
        <div className={styles.topRight}>
          <button className={styles.iconBtn} aria-label="Настройки">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button className={styles.iconBtn} aria-label="Закрыть">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.bottomCenter}>
        <button
          className={styles.centerBtnLarge}
          onClick={handleRecenter}
          aria-label="Центрировать карту"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
