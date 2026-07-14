interface Props { src: string | null; onClose: () => void }

export default function Lightbox({ src, onClose }: Props) {
  if (!src) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <img src={src} alt="preview"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()} />
      <button onClick={onClose}
        className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
