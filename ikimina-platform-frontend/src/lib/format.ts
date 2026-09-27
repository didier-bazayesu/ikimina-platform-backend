// Currency is assumed to be RWF until we wire /system-settings.
const money = new Intl.NumberFormat('en-RW', {
  style: 'currency',
  currency: 'RWF',
  maximumFractionDigits: 0,
})
export const formatMoney = (amount: number) => money.format(amount)

// The backend stores dates as Kigali-midnight in UTC ("2026-08-31T22:00:00Z"
// means 1 Sept), so always format in Africa/Kigali.
const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Africa/Kigali' })
export const formatDate = (iso: string) => date.format(new Date(iso))

export const formatNumber = (value: number) => {
  return value.toLocaleString('en-GB', {
    useGrouping: true,
    maximumFractionDigits: 0,
  })
}
