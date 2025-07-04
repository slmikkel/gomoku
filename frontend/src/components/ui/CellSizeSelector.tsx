interface CellSizeSelectorProps {
  value: 'small' | 'medium' | 'large'
  onChange: (size: 'small' | 'medium' | 'large') => void
  className?: string
}

const CELL_SIZES = [
  { value: 'small' as const, label: 'Small Cells' },
  { value: 'medium' as const, label: 'Medium Cells' },
  { value: 'large' as const, label: 'Large Cells' }
]

const CellSizeSelector = ({ 
  value, 
  onChange, 
  className = "w-full rounded-md px-3 py-2 text-sm"
}: CellSizeSelectorProps) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as 'small' | 'medium' | 'large')}
      className={className}
    >
      {CELL_SIZES.map(({ value: sizeValue, label }) => (
        <option key={sizeValue} value={sizeValue}>
          {label}
        </option>
      ))}
    </select>
  )
}

export default CellSizeSelector