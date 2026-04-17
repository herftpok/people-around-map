/** 50 mock people pins around Saint Petersburg centre */
export interface PinData {
  id: number
  name: string
  status: string
  /** URL for avatar photo */
  photo: string
  /** [lat, lng] */
  position: [number, number]
}

/* Random offset within ~1.5 km of centre */
const CENTER_LAT = 59.9343
const CENTER_LNG = 30.3351
const rnd = (seed: number) => {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}
const r = rnd(42)
const randOffset = () => (r() - 0.5) * 0.025

const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`

export const PINS: PinData[] = [
  { id: 1,  name: 'Лёша',     status: '🔥',                          photo: avatarUrl('lesha') },
  { id: 2,  name: 'Маша',     status: '✌️',                          photo: avatarUrl('masha') },
  { id: 3,  name: 'Дима',     status: '😎',                          photo: avatarUrl('dima') },
  { id: 4,  name: 'Аня',      status: 'хочу кофе',                   photo: avatarUrl('anya') },
  { id: 5,  name: 'Кирилл',   status: 'ищу компанию',                photo: avatarUrl('kirill') },
  { id: 6,  name: 'Оля',      status: '💃',                          photo: avatarUrl('olya') },
  { id: 7,  name: 'Паша',     status: 'кто на шашлыки?',             photo: avatarUrl('pasha') },
  { id: 8,  name: 'Катя',     status: 'гуляю с собакой 🐕',          photo: avatarUrl('katya') },
  { id: 9,  name: 'Максим',   status: '🎸',                          photo: avatarUrl('maxim') },
  { id: 10, name: 'Ира',      status: 'свободна сегодня вечером~',   photo: avatarUrl('ira') },
  { id: 11, name: 'Вова',     status: 'на связи',                    photo: avatarUrl('vova') },
  { id: 12, name: 'Женя',     status: '🍕 пицца?',                   photo: avatarUrl('zhenya') },
  { id: 13, name: 'Настя',    status: 'нужен кто‑то для фотосессии', photo: avatarUrl('nastya') },
  { id: 14, name: 'Саша',     status: '👋',                          photo: avatarUrl('sasha') },
  { id: 15, name: 'Лена',     status: 'на крыше',                    photo: avatarUrl('lena') },
  { id: 16, name: 'Рома',     status: 'скейт‑парк, го?',            photo: avatarUrl('roma') },
  { id: 17, name: 'Юля',      status: 'бар «Трубы» — кто тут?',      photo: avatarUrl('yulya') },
  { id: 18, name: 'Тимур',    status: '🏃',                          photo: avatarUrl('timur') },
  { id: 19, name: 'Даша',     status: 'читаю книгу в парке 📖',      photo: avatarUrl('dasha') },
  { id: 20, name: 'Антон',    status: 'залетай на покатушки',         photo: avatarUrl('anton') },
  { id: 21, name: 'Соня',     status: '🌙',                          photo: avatarUrl('sonya') },
  { id: 22, name: 'Глеб',     status: 'фрисби на Марсовом!',         photo: avatarUrl('gleb') },
  { id: 23, name: 'Полина',   status: 'лежу, страдаю',               photo: avatarUrl('polina') },
  { id: 24, name: 'Никита',   status: '🎧',                          photo: avatarUrl('nikita') },
  { id: 25, name: 'Вика',     status: 'угощаю кофе ☕',              photo: avatarUrl('vika') },
  { id: 26, name: 'Егор',     status: 'в баре один 😢',               photo: avatarUrl('egor') },
  { id: 27, name: 'Алина',    status: '💅',                          photo: avatarUrl('alina') },
  { id: 28, name: 'Коля',     status: 'ем шаурму, присоединяйтесь',  photo: avatarUrl('kolya') },
  { id: 29, name: 'Марина',   status: 'танцую у Казанского',          photo: avatarUrl('marina') },
  { id: 30, name: 'Артём',    status: '🎮 го катку?',                photo: avatarUrl('artem') },
  { id: 31, name: 'Таня',     status: 'рисую на набережной',          photo: avatarUrl('tanya') },
  { id: 32, name: 'Миша',     status: '🏀',                          photo: avatarUrl('misha') },
  { id: 33, name: 'Света',    status: 'ищу друзей в городе',           photo: avatarUrl('sveta') },
  { id: 34, name: 'Денис',    status: 'кофейня на Рубинштейна',       photo: avatarUrl('denis') },
  { id: 35, name: 'Кристина', status: '🌈',                          photo: avatarUrl('kristina') },
  { id: 36, name: 'Стас',     status: 'велопрогулка, кто со мной?',   photo: avatarUrl('stas') },
  { id: 37, name: 'Рита',     status: 'йога в парке 🧘‍♀️',            photo: avatarUrl('rita') },
  { id: 38, name: 'Олег',     status: 'просто мимо проходил',         photo: avatarUrl('oleg') },
  { id: 39, name: 'Варя',     status: '🍦',                          photo: avatarUrl('varya') },
  { id: 40, name: 'Игорь',    status: 'на крыше с гитарой',           photo: avatarUrl('igor') },
  { id: 41, name: 'Надя',     status: 'зовите на вечеринку!',         photo: avatarUrl('nadya') },
  { id: 42, name: 'Вадим',    status: '🚀',                          photo: avatarUrl('vadim') },
  { id: 43, name: 'Лиза',     status: 'карусель на Дворцовой',        photo: avatarUrl('liza') },
  { id: 44, name: 'Федя',     status: 'тут красиво',                  photo: avatarUrl('fedya') },
  { id: 45, name: 'Диана',    status: 'жду заката 🌅',               photo: avatarUrl('diana') },
  { id: 46, name: 'Толя',     status: '😤 опоздал на мост',           photo: avatarUrl('tolya') },
  { id: 47, name: 'Ксюша',    status: 'сэлфи-тайм 📸',              photo: avatarUrl('ksyusha') },
  { id: 48, name: 'Руслан',   status: 'бургеры на Невском',           photo: avatarUrl('ruslan') },
  { id: 49, name: 'Милана',   status: '♥',                           photo: avatarUrl('milana') },
  { id: 50, name: 'Тёма',     status: 'последний день лета, гуляем!', photo: avatarUrl('tyoma') },
].map((p, i) => ({
  ...p,
  position: [CENTER_LAT + randOffset(), CENTER_LNG + randOffset()] as [number, number],
}))
