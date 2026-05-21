export default function Input({ label, id, ...props }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <input
        id={id}
        className="glass-input w-full rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 outline-none transition-all focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/50"
        {...props}
      />
    </label>
  )
}
