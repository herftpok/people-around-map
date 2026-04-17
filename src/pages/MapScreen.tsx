import { useRef, useCallback, useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { StarsBackground } from '../components/StarsBackground'
import { MapPin } from '../components/MapPin'
import { PINS } from '../data/pins'
import styles from './MapScreen.module.css'

const SPB_CENTER: [number, number] = [59.9343, 30.3351]
const MAP_ZOOM = 13   // more city visible in the initial circle

const DEFAULT_SCALE = 1.35
const CIRCLE_VW = 95
const MIN_SCALE = (100 - 10) / CIRCLE_VW  // круг помещается в экран с ~5vw отступом по бокам
const MAX_SCALE = 8.0
const WHEEL_SENSITIVITY = 0.015
const LERP_SPEED = 0.12

/* ---- helper: recenter map ---- */
function RecenterButton({ center }: { center: [number, number] }) {
  const map = useMap()
  const handleClick = useCallback(() => {
    map.setView(center, MAP_ZOOM, { animate: false })
  }, [map, center])

  return (
    <button
      className={styles.centerBtn}
      onClick={handleClick}
      aria-label="Центрировать карту"
    />
  )
}

const ROTATION_WHEEL_SENSITIVITY = 0.3

export function MapScreen() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(DEFAULT_SCALE)
  const targetScaleRef = useRef(DEFAULT_SCALE)
  const rotationRef = useRef(0)
  const targetRotationRef = useRef(0)
  const rafRef = useRef(0)
  const animatingRef = useRef(false)
  const pinchRef = useRef({ startDist: 0, startScale: 1, startAngle: 0, startRotation: 0 })

  /* Lightweight state broadcast for pin components (throttled via rAF) */
  const [pinView, setPinView] = useState({ scale: DEFAULT_SCALE, rotation: 0 })
  const pinViewRAF = useRef(0)
  const broadcastPinView = useCallback(() => {
    cancelAnimationFrame(pinViewRAF.current)
    pinViewRAF.current = requestAnimationFrame(() => {
      setPinView({ scale: scaleRef.current, rotation: rotationRef.current })
    })
  }, [])

  const applyTransform = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.style.transform = `scale(${scaleRef.current}) rotate(${rotationRef.current}deg)`
    }
    broadcastPinView()
  }, [broadcastPinView])

  const animate = useCallback(() => {
    const scaleDiff = targetScaleRef.current - scaleRef.current
    const rotDiff = targetRotationRef.current - rotationRef.current
    if (Math.abs(scaleDiff) < 0.001 && Math.abs(rotDiff) < 0.05) {
      scaleRef.current = targetScaleRef.current
      rotationRef.current = targetRotationRef.current
      applyTransform()
      animatingRef.current = false
      return
    }
    scaleRef.current += scaleDiff * LERP_SPEED
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

  useEffect(() => {
    applyTransform()

    const el = sceneRef.current?.parentElement
    if (!el) return

    /* ---- wheel: zoom (normal) / rotate (shift) ---- */
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.shiftKey) {
        const delta = (e.deltaY || e.deltaX) * ROTATION_WHEEL_SENSITIVITY
        targetRotationRef.current += delta
      } else {
        const delta = -e.deltaY * WHEEL_SENSITIVITY
        targetScaleRef.current = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScaleRef.current + delta))
      }
      startAnimation()
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

    /* ---- two-finger: pinch zoom + rotation ---- */
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          startDist: getTouchDist(e),
          startScale: scaleRef.current,
          startAngle: getTouchAngle(e),
          startRotation: rotationRef.current,
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        /* zoom */
        const dist = getTouchDist(e)
        const ratio = dist / pinchRef.current.startDist
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchRef.current.startScale * ratio))
        targetScaleRef.current = newScale
        scaleRef.current = newScale

        /* rotation */
        const angleDelta = getTouchAngle(e) - pinchRef.current.startAngle
        const newRotation = pinchRef.current.startRotation + angleDelta
        targetRotationRef.current = newRotation
        rotationRef.current = newRotation

        applyTransform()
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [applyTransform, startAnimation])

  const handleRecenter = useCallback(() => {
    targetScaleRef.current = DEFAULT_SCALE
    targetRotationRef.current = 0
    startAnimation()
    const inner = document.querySelector(`.${styles.centerBtn}`) as HTMLButtonElement | null
    inner?.click()
  }, [startAnimation])

  return (
    <div className={styles.screen}>
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
            dragging
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              keepBuffer={4}
            />
            <RecenterButton center={SPB_CENTER} />
            {PINS.map(pin => (
              <MapPin
                key={pin.id}
                pin={pin}
                scale={pinView.scale}
                rotation={pinView.rotation}
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
