// Carte glassmorphism — charte Bastion Digital.
export default function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-cyan/15 bg-white/5 backdrop-blur-[12px] ${className}`}
    >
      {children}
    </div>
  )
}
