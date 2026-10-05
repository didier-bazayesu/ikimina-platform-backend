interface AvatarProps {
  initials: string
  className?: string
}

export function Avatar({ initials, className = '' }: AvatarProps) {
  return (
    <div className={`flex items-center justify-center bg-brand-green/10 text-brand-green font-semibold rounded-full w-8 h-8 text-sm ${className}`}>
      {initials}
    </div>
  )
}
