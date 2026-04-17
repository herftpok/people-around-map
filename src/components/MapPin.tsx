import { useEffect, useMemo } from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import type { PinData } from '../data/pins'
import styles from './MapPin.module.css'

interface Props {
  pin: PinData
  /** true when zoomed past threshold (after 200ms debounce) */
  expanded: boolean
}

const PIN_SMALL = 24  // px — compact circle
const PIN_LARGE = 52  // px — expanded rounded square

/** Characters considered "short" — always visible */
const isShort = (s: string) => [...s].length <= 3

export function MapPin({ pin, expanded }: Props) {
  const short = isShort(pin.status)

  /* Create the icon wrapper once per pin — never recreate */
  const wrapper = useMemo(() => {
    const el = document.createElement('div')
    el.className = styles.pin
    el.innerHTML = `
      <div class="${styles.statusWrap} ${short ? styles.short : ''}">
        <span class="${styles.statusText}">${pin.status}</span>
      </div>
      <div class="${styles.avatar}" style="background:${pin.bgColor}">
        <img src="${pin.photo}" alt="${pin.name}" loading="lazy" />
      </div>
    `
    return el
  }, [pin, short])

  const leafletIcon = useMemo(() => {
    const size = expanded ? PIN_LARGE : PIN_SMALL
    return L.divIcon({
      html: wrapper,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }, [wrapper, expanded])

  /* Toggle expanded class on avatar & status — no React re-render needed for
     rotation/scale because those are handled by CSS custom properties */
  useEffect(() => {
    const avatar = wrapper.querySelector(`.${styles.avatar}`) as HTMLElement | null
    if (avatar) avatar.classList.toggle(styles.expanded, expanded)

    const statusWrap = wrapper.querySelector(`.${styles.statusWrap}`) as HTMLElement | null
    if (statusWrap) statusWrap.classList.toggle(styles.revealed, expanded && !short)
  }, [wrapper, expanded, short])

  return <Marker position={pin.position} icon={leafletIcon} />
}

