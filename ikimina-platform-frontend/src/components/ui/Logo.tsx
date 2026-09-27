interface LogoProps {
  className?: string
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 font-bold text-white shadow-sm ring-1 ring-white/30">
        IK
      </div>
      <div className="flex flex-col">
        <span className="font-heading text-lg font-bold leading-tight text-white tracking-tight">IKIMINA</span>
        <span className="text-[10px] font-medium tracking-widest text-white/70 uppercase">GENTS · INVESTMENT</span>
      </div>
    </div>
  )
}

export function LogoDark({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green text-white font-bold shadow-sm">
        IK
      </div>
      <div className="flex flex-col">
        <span className="font-heading text-lg font-bold leading-tight text-text-main tracking-tight">IKIMINA</span>
        <span className="text-[10px] font-medium tracking-widest text-text-muted uppercase">GENTS · INVESTMENT</span>
      </div>
    </div>
  )
}
