const variants = {
  primary: 'bg-cyan text-navy hover:brightness-110',
  ghost: 'border border-cyan/30 text-text-primary hover:bg-white/5'
}

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
