import { useState } from 'react'
import IconSelectionGrid from './IconSelectionGrid'

interface IconSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onIconSelect: (icon: string) => void
  excludedIcons: string[]
  preSelectedIcon?: string
}

const IconSelectionModal = ({ 
  isOpen, 
  onClose, 
  onIconSelect, 
  excludedIcons, 
  preSelectedIcon 
}: IconSelectionModalProps) => {
  const [selectedIcon, setSelectedIcon] = useState<string | null>(preSelectedIcon || null)

  if (!isOpen) return null

  const handleIconSelect = (icon: string) => {
    setSelectedIcon(icon)
  }

  const handleConfirm = () => {
    if (selectedIcon) {
      onIconSelect(selectedIcon)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background border border-border rounded-lg w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Fixed header */}
        <div className="text-center p-6 border-b border-border flex-shrink-0">
          <h2 className="text-xl font-bold mb-2">Choose Your Player Icon</h2>
          <p className="text-sm text-muted-foreground">
            {preSelectedIcon 
              ? "Click Confirm to use the current icon, or select a different one below."
              : "Select an icon to represent you in the game"
            }
          </p>
        </div>

        {/* Current/Selected icons - fixed section */}
        {(preSelectedIcon || selectedIcon) && (
          <div className="flex items-center justify-center gap-10 p-4 border-b border-border flex-shrink-0">
            {preSelectedIcon && (
              <div className="bg-accent/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-2 text-center">Current Icon</h3>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-lg border-2 border-primary bg-background flex items-center justify-center">
                    <div className="text-4xl">
                      {preSelectedIcon}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedIcon && (
              <div className="bg-accent/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-2 text-center">Selected Icon</h3>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-lg border-2 border-primary bg-background flex items-center justify-center">
                    <div className="text-4xl">
                      {selectedIcon}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scrollable icon grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <IconSelectionGrid 
            excludedIcons={excludedIcons}
            onIconSelect={handleIconSelect}
          />
        </div>

        {/* Fixed footer buttons */}
        <div className="flex gap-3 justify-end p-6 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedIcon && !preSelectedIcon}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {selectedIcon ? 'Use Selected Icon' : (preSelectedIcon ? 'Keep Current Icon' : 'Select Icon')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default IconSelectionModal