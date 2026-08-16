export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(231 54% 80%) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(231 54% 80%) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Brand watermark */}
      <div className="absolute top-8 left-8 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-indigo-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold tracking-tight">RE</span>
        </div>
        <span className="text-white/70 text-sm font-medium tracking-wide">RE CRM</span>
      </div>

      <div className="relative w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
