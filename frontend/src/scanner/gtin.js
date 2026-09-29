export function pruefzifferGueltig(barcode) {
  if (!/^\d+$/.test(barcode) || ![8, 12, 13, 14].includes(barcode.length)) return false
  let summe = 0
  for (let i = barcode.length - 2, position = 0; i >= 0; i--, position++) summe += Number(barcode[i]) * (position % 2 === 0 ? 3 : 1)
  return (10 - summe % 10) % 10 === Number(barcode.at(-1))
}
