interface BoardSizeSelectorProps {
  value: number
  onChange: (size: number) => void
  className?: string
  showDescriptions?: boolean
}

const BOARD_SIZES = [
  { size: 6, desc: '6x6 (Mini)' },
  { size: 8, desc: '8x8 (Standard)' },
  { size: 10, desc: '10x10 (Medium)' },
  { size: 12, desc: '12x12 (Large)' },
  { size: 15, desc: '15x15 (XL)' },
  { size: 18, desc: '18x18 (XXL)' },
  { size: 20, desc: '20x20 (Huge)' },
  { size: 24, desc: '24x24 (Ultimate)' }
]

const BoardSizeSelector = ({ 
  value, 
  onChange, 
  className = "w-full rounded-md px-3 py-2 text-sm",
  showDescriptions = true 
}: BoardSizeSelectorProps) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={className}
    >
      {BOARD_SIZES.map(({ size, desc }) => (
        <option key={size} value={size}>
          {showDescriptions ? desc : `${size}×${size}`}
        </option>
      ))}
    </select>
  )
}

export default BoardSizeSelector