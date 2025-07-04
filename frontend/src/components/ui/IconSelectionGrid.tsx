import { IndividualIcon, getAvailableIconsForThirdPlayer } from '../../services/iconService'

interface IconSelectionGridProps {
  excludedIcons: string[]
  onIconSelect: (icon: string) => void
}

const IconSelectionGrid = ({ excludedIcons, onIconSelect }: IconSelectionGridProps) => {
  // Get all available icons excluding the ones already taken
  const availableIcons = getAvailableIconsForThirdPlayer(excludedIcons)

  // Fixed grid size of 10 columns
  const gridSize = 10
  const totalSlots = Math.ceil(availableIcons.length / gridSize) * gridSize

  // Fill empty slots
  const gridSlots: (IndividualIcon | null)[] = [...availableIcons]
  while (gridSlots.length < totalSlots) {
    gridSlots.push(null)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center">
        Available Icons
      </h3>
      <div 
        className={`grid gap-3 mx-auto`}
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          maxWidth: `${gridSize * 4}rem`
        }}
      >
        {gridSlots.map((iconData, index) => (
          <div
            key={index}
            className={`
              aspect-square w-14 h-14 rounded-lg border-2 flex items-center justify-center
              ${iconData 
                ? 'bg-background border-border hover:border-primary hover:bg-accent cursor-pointer transition-all duration-200 scale-90 hover:scale-100' 
                : 'bg-accent/20 border-dashed border-muted-foreground/30'
              }
            `}
            onClick={() => iconData && onIconSelect(iconData.icon)}
            title={iconData?.name}
          >
            {iconData && (
              <div className="text-center">
                <div className="text-2xl">
                  {iconData.icon}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate w-full">
                  {iconData.category}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Click on an icon to select it as your player symbol
      </p>
    </div>
  )
}

export default IconSelectionGrid