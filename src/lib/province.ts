export const PROVINCES = [
  'Dolnośląskie','Kujawsko-pomorskie','Lubelskie','Lubuskie','Łódzkie','Małopolskie','Mazowieckie','Opolskie','Podkarpackie','Podlaskie','Pomorskie','Śląskie','Świętokrzyskie','Warmińsko-mazurskie','Wielkopolskie','Zachodniopomorskie'
]

const CITY_TO_PROVINCE: Record<string, string> = {
  gdynia: 'Pomorskie', gdansk: 'Pomorskie', sopot: 'Pomorskie',
  warszawa: 'Mazowieckie', krakow: 'Małopolskie', 'kraków': 'Małopolskie',
  wroclaw: 'Dolnośląskie', 'wrocław': 'Dolnośląskie', poznan: 'Wielkopolskie', 'poznań': 'Wielkopolskie',
  szczecin: 'Zachodniopomorskie', lublin: 'Lubelskie', bialystok: 'Podlaskie', 'białystok': 'Podlaskie',
  rzeszow: 'Podkarpackie', 'rzeszów': 'Podkarpackie', opole: 'Opolskie', kielce: 'Świętokrzyskie',
  olsztyn: 'Warmińsko-mazurskie', katowice: 'Śląskie', lodz: 'Łódzkie', 'łódź': 'Łódzkie',
  torun: 'Kujawsko-pomorskie', 'toruń': 'Kujawsko-pomorskie', gorzow: 'Lubuskie', 'gorzów': 'Lubuskie', zielona: 'Lubuskie'
}

export function deriveProvince(input: string): string {
  const text = (input || '').toString()
  if (!text) return ''
  const lower = text.toLowerCase()
  for (const p of PROVINCES) {
    if (lower.includes(p.toLowerCase())) return p
  }
  for (const city of Object.keys(CITY_TO_PROVINCE)) {
    if (lower.includes(city)) return CITY_TO_PROVINCE[city]
  }
  return ''
}
