interface PlayIconProps {
  className?: string
}

export default function PlayIcon({ className = 'w-5 h-5' }: PlayIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
