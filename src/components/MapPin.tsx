import { useEffect, useRef, useMemo } from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import type { PinData } from '../data/pins'
import styles from './MapPin.module.css'

interface Props {
  pin: PinData
  /** true when zoomed past threshold (after 200ms debounce) */
  expanded: boolean
  /** Current rotation of the scene in degrees */
  rotation: number
  /** Current scene scale — used to counter-scale status text */
  scale: number
}

const PIN_SMALL = 14  // px — compact circle
const PIN_LARGE = 36  // px — expanded rounded square

/** Characters considered "short" — always visible */
const isShort = (s: string) => [...s].length <= 3

export function MapPin({ pin, expanded, rotation, scale }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const short = isShort(pin.status)

  /* Create the icon once per pin — never recreate */
  const icon = useMemo(() => {
    const wrapper = document.createElement('div')
    wrapper.className = styles.pin
    wrapper.innerHTML = `
      <div class="${styles.statusWrap} ${short ? styles.short : ''}">
        <span class="${styles.statusText}">${pin.status}</span>
      </div>
      <div class="${styles.avatar}" style="background:${pin.bgColor}">
        <img src="${pin.photo}" alt="${pin.name}" loading="lazy" />
      </div>
    `
    // Keep ref to wrapper so we can mutate classes/styles
    return { wrapper, leaflet: null as L.DivIcon | null }
  }, [pin, short])

  const leafletIcon = useMemo(() => {
    const size = expanded ? PIN_LARGE : PIN_SMALL
    const divIcon = L.divIcon({
      html: icon.wrapper,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
    icon.leaflet = divIcon
    return divIcon
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icon, expanded])

  /* Update classes & inline styles reactively without recreating icon */
  useEffect(() => {
    const w = icon.wrapper
    if (!w) return

    // Rotation
    w.style.transform = `rotate(${-rotation}deg)`

    // Expanded state on avatar
    const avatar = w.querySelector(`.${styles.avatar}`) as HTMLElement | null
    if (avatar) {
      avatar.classList.toggle(styles.expanded, expanded)
    }

    // Status visibility
    const statusWrap = w.querySelector(`.${styles.statusWrap}`) as HTMLElement | null
    if (statusWrap) {
      statusWrap.classList.toggle(styles.revealed, expanded && !short)
      // Counter-scale the status bubble so it doesn't blow up with scene scale
      const counterScale = Math.min(1, 1 / scale)
      statusWrap.style.transform = `translateX(-50%) scale(${counterScale})`
    }
  }, [icon, expanded, rotation, scale, short])

  return <Marker position={pin.position} icon={leafletIcon} ref={elRef as never} />
}

