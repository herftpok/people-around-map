/** 50 mock people pins spread evenly across visible Saint Petersburg area */
export interface PinData {
  id: number
  name: string
  status: string
  /** URL for avatar photo */
  photo: string
  /** Background colour for avatar placeholder */
  bgColor: string
  /** [lat, lng] */
  position: [number, number]
}

const CENTER_LAT = 59.9343
const CENTER_LNG = 30.3351
/** ~3 km radius in degrees (enough for zoom-13 circle) */
const RADIUS_LAT = 0.035
const RADIUS_LNG = 0.06

/* Deterministic PRNG */
const rnd = (seed: number) => {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}
const r = rnd(77)

/**
 * Sunflower / Fibonacci-disc distribution — gives very even spread
 * inside the visible circle with a small jitter so it looks natural.
 */
function fibonacci(n: number): [number, number][] {
  const golden = (1 + Math.sqrt(5)) / 2
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n
    const radius = Math.sqrt(f) * 0.92
    const theta = 2 * Math.PI * i / (golden * golden)
    const jitter = 0.04
    const lat = CENTER_LAT + (radius * Math.cos(theta) + (r() - 0.5) * jitter) * RADIUS_LAT
    const lng = CENTER_LNG + (radius * Math.sin(theta) + (r() - 0.5) * jitter) * RADIUS_LNG
    pts.push([lat, lng])
  }
  return pts
}

const positions = fibonacci(50)

const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`

const BG_COLORS = [
  '#b6e3f4', '#c0aede', '#d1d4f9', '#ffd5dc', '#ffdfbf',
  '#c1f0c1', '#ffe0b2', '#b2dfdb', '#f0e68c', '#e1bee7',
]

const RAW: Omit<PinData, 'position' | 'bgColor'>[] = [
  { id: 1,  name: 'Лёша',     status: '🔥',                          photo: avatarUrl('lesha') },
  { id: 2,  name: 'Маша',     status: '✌️',                          photo: avatarUrl('masha') },
  { id: 3,  name: 'Дима',     status: '😎',                          photo: avatarUrl('dima') },
  { id: 4,  name: 'Аня',      status: 'хочу кофе',                   photo: avatarUrl('anya') },
  { id: 5,  name: 'Кирилл',   status: 'ищу компанию',                photo: avatarUrl('kirill') },
  { id: 6,  name: 'Оля',      status: '💃',                          photo: avatarUrl('olya') },
  { id: 7,  name: 'Паша',     status: 'кто на шашлыки?',             photo: avatarUrl('pasha') },
  { id: 8,  name: 'Катя',     status: 'гуляю с собакой 🐕',          photo: avatarUrl('katya') },
  { id: 9,  name: 'Максим',   status: '🎸',                          photo: avatarUrl('maxim') },
  { id: 10, name: 'Ира',      status: 'свободна вечером~',           photo: avatarUrl('ira') },
  { id: 11, name: 'Вова',     status: 'на связи',                    photo: avatarUrl('vova') },
  { id: 12, name: 'Женя',     status: '🍕 пицца?',                   photo: avatarUrl('zhenya') },
  { id: 13, name: 'Настя',    status: 'нужен фотограф',              photo: avatarUrl('nastya') },
  { id: 14, name: 'Саша',     status: '👋',                          photo: avatarUrl('sasha') },
  { id: 15, name: 'Лена',     status: 'на крыше',                    photo: avatarUrl('lena') },
  { id: 16, name: 'Рома',     status: 'скейт‑парк, го?',            photo: avatarUrl('roma') },
  { id: 17, name: 'Юля',      status: 'бар «Трубы»',                 photo: avatarUrl('yulya') },
  { id: 18, name: 'Тимур',    status: '🏃',                          photo: avatarUrl('timur') },
  { id: 19, name: 'Даша',     status: 'книга в парке 📖',            photo: avatarUrl('dasha') },
  { id: 20, name: 'Антон',    status: 'го покатушки',                 photo: avatarUrl('anton') },
  { id: 21, name: 'Соня',     status: '🌙',                          photo: avatarUrl('sonya') },
  { id: 22, name: 'Глеб',     status: 'фрисби!',                     photo: avatarUrl('gleb') },
  { id: 23, name: 'Полина',   status: 'лежу, страдаю',               photo: avatarUrl('polina') },
  { id: 24, name: 'Никита',   status: '🎧',                          photo: avatarUrl('nikita') },
  { id: 25, name: 'Вика',     status: 'угощаю кофе ☕',              photo: avatarUrl('vika') },
  { id: 26, name: 'Егор',     status: 'в баре один 😢',               photo: avatarUrl('egor') },
  { id: 27, name: 'Алина',    status: '💅',                          photo: avatarUrl('alina') },
  { id: 28, name: 'Коля',     status: 'ем шаурму',                   photo: avatarUrl('kolya') },
  { id: 29, name: 'Марина',   status: 'танцую 💃',                   photo: avatarUrl('marina') },
  { id: 30, name: 'Артём',    status: '🎮 го катку?',                photo: avatarUrl('artem') },
  { id: 31, name: 'Таня',     status: 'рисую',                       photo: avatarUrl('tanya') },
  { id: 32, name: 'Миша',     status: '🏀',                          photo: avatarUrl('misha') },
  { id: 33, name: 'Света',    status: 'ищу друзей',                   photo: avatarUrl('sveta') },
  { id: 34, name: 'Денис',    status: 'кофейня ☕',                   photo: avatarUrl('denis') },
  { id: 35, name: 'Кристина', status: '🌈',                          photo: avatarUrl('kristina') },
  { id: 36, name: 'Стас',     status: 'велопрогулка',                 photo: avatarUrl('stas') },
  { id: 37, name: 'Рита',     status: 'йога 🧘‍♀️',                    photo: avatarUrl('rita') },
  { id: 38, name: 'Олег',     status: 'мимо проходил',                photo: avatarUrl('oleg') },
  { id: 39, name: 'Варя',     status: '🍦',                          photo: avatarUrl('varya') },
  { id: 40, name: 'Игорь',    status: 'гитара на крыше',              photo: avatarUrl('igor') },
  { id: 41, name: 'Надя',     status: 'зовите!',                      photo: avatarUrl('nadya') },
  { id: 42, name: 'Вадим',    status: '🚀',                          photo: avatarUrl('vadim') },
  { id: 43, name: 'Лиза',     status: 'Дворцовая',                    photo: avatarUrl('liza') },
  { id: 44, name: 'Федя',     status: 'тут красиво',                  photo: avatarUrl('fedya') },
  { id: 45, name: 'Диана',    status: 'жду заката 🌅',               photo: avatarUrl('diana') },
  { id: 46, name: 'Толя',     status: '😤 мост!',                    photo: avatarUrl('tolya') },
  { id: 47, name: 'Ксюша',    status: 'сэлфи 📸',                   photo: avatarUrl('ksyusha') },
  { id: 48, name: 'Руслан',   status: 'бургеры',                      photo: avatarUrl('ruslan') },
  { id: 49, name: 'Милана',   status: '♥',                           photo: avatarUrl('milana') },
  { id: 50, name: 'Тёма',     status: 'гуляем!',                      photo: avatarUrl('tyoma') },
]

export const PINS: PinData[] = RAW.map((p, i) => ({
  ...p,
  bgColor: BG_COLORS[i % BG_COLORS.length],
  position: positions[i],
}))
