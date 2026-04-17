import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import type { PinData } from '../data/pins'
import styles from './MapPin.module.css'

interface Props {
  pin: PinData
  /** Current CSS scale of the scene (drives size & status reveal) */
  scale: number
  /** Current rotation of the scene in degrees (counter-rotated) */
  rotation: number
}

/* ---- thresholds ---- */
const SCALE_GROW_START = 2.0   // pins start growing
const SCALE_GROW_END = 4.5     // pins reach full size
const PIN_MIN = 14             // px at small zoom
const PIN_MAX = 38             // px at large zoom
const STATUS_REVEAL_SCALE = 2.8 // status becomes visible

/** Characters considered "short" — always visible */
const isShort = (s: string) => [...s].length <= 3

export function MapPin({ pin, scale, rotation }: Props) {
  const pinSize = Math.round(
    PIN_MIN + (PIN_MAX - PIN_MIN) * Math.min(1, Math.max(0, (scale - SCALE_GROW_START) / (SCALE_GROW_END - SCALE_GROW_START)))
  )
  const statusRevealed = scale >= STATUS_REVEAL_SCALE
  const short = isShort(pin.status)

  const icon = useMemo(() => {
    const statusClass = statusRevealed
      ? styles.revealed
      : short
        ? styles.short
        : ''

    const html = `
      <div class="${styles.pin}" style="transform: rotate(${-rotation}deg)">
        <div class="${styles.statusWrap} ${statusClass}">
          <span class="${styles.statusText}">${pin.status}</span>
        </div>
        <div class="${styles.avatar}" style="--pin-size:${pinSize}px">
          <img src="${pin.photo}" alt="${pin.name}" loading="lazy" />
        </div>
      </div>
    `

    return L.divIcon({
      html,
      className: '',
      iconSize: [pinSize, pinSize],
      iconAnchor: [pinSize / 2, pinSize / 2],
    })
  }, [pin, pinSize, statusRevealed, short, rotation])

  return <Marker position={pin.position} icon={icon} />
}
