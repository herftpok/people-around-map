import { useRef, useCallback, useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import type { Map as LeafletMap } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { StarsBackground } from '../components/StarsBackground'
import { MapPin } from '../components/MapPin'
import { PINS } from '../data/pins'
import styles from './MapScreen.module.css'

const SPB_CENTER: [number, number] = [59.9343, 30.3351]
const MAP_RADIUS_KM = 3  // limit map panning to 3km from center
const MAP_BOUNDS = L.latLng(SPB_CENTER[0], SPB_CENTER[1]).toBounds(MAP_RADIUS_KM * 2 * 1000)
const MAP_ZOOM = 13
const MIN_ZOOM = 13          // can't zoom out past the initial view
const MAX_VIRTUAL_ZOOM = 22  // virtual zoom range (beyond Leaflet)
const LEAFLET_MAX_ZOOM = 14  // tiles load only 13→14, beyond = pure CSS scale (less flicker)
const EXPAND_ZOOM = 15       // virtual zoom at which pins expand
const EXPAND_DELAY = 150
const WHEEL_ZOOM_SPEED = 0.006
const ROTATION_WHEEL_SENSITIVITY = 0.3
const LERP_SPEED = 0.13

/* Scene CSS scale: zoom 13 → 1, zoom 22 → 8 (exponential).
   Circle starts at 95vw and grows to 95vw × 8 = 760vw at max zoom. */
const MAX_SCENE_SCALE = 8
const SCALE_RATE = Math.log2(MAX_SCENE_SCALE) / (MAX_VIRTUAL_ZOOM - MAP_ZOOM)
const sceneScaleForZoom = (z: number) => Math.pow(2, (z - MAP_ZOOM) * SCALE_RATE)

/* Leaflet zoom is capped — beyond LEAFLET_MAX_ZOOM only CSS scale grows.
   This prevents tile reloading flicker at deep zoom. */
const leafletZoomFor = (z: number) => Math.min(z, LEAFLET_MAX_ZOOM)

/* ---- Expose map instance to parent via ref ---- */
function MapRefGrabber({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  return null
}

export function MapScreen() {
  const screenRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  /* ---- zoom & rotation state ---- */
  const zoomRef = useRef(MAP_ZOOM)
  const targetZoomRef = useRef(MAP_ZOOM)
  const rotationRef = useRef(0)
  const targetRotationRef = useRef(0)
  const rafRef = useRef(0)
  const animatingRef = useRef(false)

  /* ---- pin expansion ---- */
  const [pinsExpanded, setPinsExpanded] = useState(false)
  const expandTimerRef = useRef(0)

  /* ---- gesture state ---- */
  const pinchRef = useRef({ startDist: 0, startZoom: MAP_ZOOM, startAngle: 0, startRotation: 0 })
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 })

  /* ---- apply scene transform (scale + rotate), sync Leaflet zoom, CSS vars ---- */
  const applyTransform = useCallback(() => {
    const scale = sceneScaleForZoom(zoomRef.current)
    if (sceneRef.current) {
      sceneRef.current.style.transform = `scale(${scale}) rotate(${rotationRef.current}deg)`
    }
    if (screenRef.current) {
      screenRef.current.style.setProperty('--scene-scale', String(scale))
      screenRef.current.style.setProperty('--scene-rotation', String(rotationRef.current))
    }
    /* sync Leaflet zoom (capped at LEAFLET_MAX_ZOOM to avoid tile flicker) */
    const map = mapRef.current
    const lz = leafletZoomFor(zoomRef.current)
    if (map && Math.abs(map.getZoom() - lz) > 0.01) {
      map.setZoom(lz, { animate: false })
    }
    /* debounced expand check */
    window.clearTimeout(expandTimerRef.current)
    expandTimerRef.current = window.setTimeout(() => {
      setPinsExpanded(zoomRef.current >= EXPAND_ZOOM)
    }, EXPAND_DELAY)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- lerp animation for zoom + rotation ---- */
  const animate = useCallback(() => {
    const zoomDiff = targetZoomRef.current - zoomRef.current
    const rotDiff = targetRotationRef.current - rotationRef.current
    if (Math.abs(zoomDiff) < 0.01 && Math.abs(rotDiff) < 0.05) {
      zoomRef.current = targetZoomRef.current
      rotationRef.current = targetRotationRef.current
      applyTransform()
      animatingRef.current = false
      return
    }
    zoomRef.current += zoomDiff * LERP_SPEED
    rotationRef.current += rotDiff * LERP_SPEED
    applyTransform()
    rafRef.current = requestAnimationFrame(animate)
  }, [applyTransform])

  const startAnimation = useCallback(() => {
    if (!animatingRef.current) {
      animatingRef.current = true
      rafRef.current = requestAnimationFrame(animate)
    }
  }, [animate])

  /* ---- drag with rotation + scale compensation, clamped to 3km bounds ---- */
  const panCompensated = useCallback((dx: number, dy: number) => {
    const map = mapRef.current
    if (!map) return
    const scale = sceneScaleForZoom(zoomRef.current)
    const rad = -rotationRef.current * Math.PI / 180
    const mx = (dx * Math.cos(rad) - dy * Math.sin(rad)) / scale
    const my = (dx * Math.sin(rad) + dy * Math.cos(rad)) / scale
    map.panBy([-mx, -my], { animate: false })
    // clamp to bounds after pan
    const c = map.getCenter()
    const clamped = L.latLng(
      Math.max(MAP_BOUNDS.getSouth(), Math.min(MAP_BOUNDS.getNorth(), c.lat)),
      Math.max(MAP_BOUNDS.getWest(), Math.min(MAP_BOUNDS.getEast(), c.lng))
    )
    if (c.lat !== clamped.lat || c.lng !== clamped.lng) {
      map.setView(clamped, map.getZoom(), { animate: false })
    }
  }, [])

  /* ---- main event listeners ---- */
  useEffect(() => {
    applyTransform()
    const el = screenRef.current
    if (!el) return

    /* wheel: normal → zoom, shift → rotation */
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.shiftKey) {
        targetRotationRef.current += (e.deltaY || e.deltaX) * ROTATION_WHEEL_SENSITIVITY
      } else {
        const delta = -e.deltaY * WHEEL_ZOOM_SPEED
        targetZoomRef.current = Math.min(MAX_VIRTUAL_ZOOM, Math.max(MIN_ZOOM, targetZoomRef.current + delta))
      }
      startAnimation()
    }

    /* touch helpers */
    const getTouchDist = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]]
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    }
    const getTouchAngle = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]]
      return Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * (180 / Math.PI)
    }

    /* touch start */
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          startDist: getTouchDist(e),
          startZoom: zoomRef.current,
          startAngle: getTouchAngle(e),
          startRotation: rotationRef.current,
        }
        dragRef.current.active = false
      } else if (e.touches.length === 1) {
        dragRef.current = { active: true, lastX: e.touches[0].clientX, lastY: e.touches[0].clientY }
      }
    }

    /* touch move: 2-finger → pinch zoom + rotate, 1-finger → drag */
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        /* zoom */
        const dist = getTouchDist(e)
        const ratio = dist / pinchRef.current.startDist
        const zoomDelta = Math.log2(ratio)
        const z = Math.min(MAX_VIRTUAL_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.startZoom + zoomDelta))
        zoomRef.current = z
        targetZoomRef.current = z
        /* rotation */
        const angleDelta = getTouchAngle(e) - pinchRef.current.startAngle
        rotationRef.current = pinchRef.current.startRotation + angleDelta
        targetRotationRef.current = rotationRef.current
        applyTransform()
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

    /* mouse drag (desktop) with rotation + scale compensation */
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
  }, [applyTransform, startAnimation, panCompensated])

  const handleRecenter = useCallback(() => {
    targetZoomRef.current = MAP_ZOOM
    targetRotationRef.current = 0
    startAnimation()
    mapRef.current?.setView(SPB_CENTER, undefined, { animate: false })
  }, [startAnimation])

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
            maxZoom={LEAFLET_MAX_ZOOM}
            maxBounds={MAP_BOUNDS}
            maxBoundsViscosity={1.0}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              keepBuffer={10}
              updateWhenZooming={false}
              updateWhenIdle={true}
            />
            <MapRefGrabber mapRef={mapRef} />
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
