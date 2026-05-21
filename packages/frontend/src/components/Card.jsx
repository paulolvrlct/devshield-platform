// Carte glassmorphism — charte Bastion Digital.
export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl border border-cyan/15 bg-white/5 backdrop-blur-[12px] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
