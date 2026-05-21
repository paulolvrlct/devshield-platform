// Carte glassmorphism — charte DevShield.
export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`glass-card rounded-2xl ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
