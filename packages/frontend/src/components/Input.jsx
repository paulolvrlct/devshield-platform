export default function Input({ label, id, ...props }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-sm text-text-secondary">{label}</span>
      <input
        id={id}
        className="w-full rounded-lg border border-cyan/15 bg-navy/50 px-3 py-2.5 text-text-primary outline-none transition focus:border-cyan/50"
        {...props}
      />
    </label>
  )
}
