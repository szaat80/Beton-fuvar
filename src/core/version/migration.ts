// FRISSÍTÉS KULCSA - v68 -> v70 AUTOMATIKUS
export function migrate() {
  // régi kulcsok átvétele
  const regiKeys = ['fuvarok', 'fuvarok_v68', 'fuvarok_v69']
  for (const k of regiKeys) {
    const data = localStorage.getItem(k)
    if (data && !localStorage.getItem('fuvarok_v70')) {
      localStorage.setItem('fuvarok_v70', data)
      console.log(`[MIGRATION] ${k} -> fuvarok_v70 OK`)
    }
  }
}
