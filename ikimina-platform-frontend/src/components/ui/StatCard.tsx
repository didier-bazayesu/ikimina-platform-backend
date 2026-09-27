import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  caption?: string
  tone?: 'default' | 'danger'
}

export function StatCard({ label, value, unit, caption, tone = 'default' }: StatCardProps) {
  const isDanger = tone === 'danger'
  return (
    <Card className={`p-5 ${isDanger ? 'bg-terracotta-tint border-terracotta/20' : ''}`}>
      <div className={`text-sm font-medium ${isDanger ? 'text-terracotta' : 'text-text-muted'}`}>
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <div className={`text-2xl font-bold ${isDanger ? 'text-terracotta' : 'text-text-main'}`}>
          {value}
        </div>
        {unit && (
          <div className={`text-sm font-medium ${isDanger ? 'text-terracotta/80' : 'text-text-muted'}`}>
            {unit}
          </div>
        )}
      </div>
      {caption && (
        <div className={`mt-1 text-xs ${isDanger ? 'text-terracotta/80' : 'text-text-muted'}`}>
          {caption}
        </div>
      )}
    </Card>
  )
}
