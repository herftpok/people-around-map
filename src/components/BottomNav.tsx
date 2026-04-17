import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const navItems = [
  { to: '/', label: 'Главная', icon: '🏠' },
  { to: '/explore', label: 'Поиск', icon: '🔍' },
  { to: '/messages', label: 'Чаты', icon: '💬' },
  { to: '/profile', label: 'Профиль', icon: '👤' },
]

export function BottomNav() {
  return (
    <nav className={styles.nav}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `${styles.item} ${isActive ? styles.active : ''}`
          }
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
