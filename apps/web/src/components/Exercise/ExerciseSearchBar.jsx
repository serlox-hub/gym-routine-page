import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ChevronDown } from 'lucide-react'
import { colors, inputStyle } from '../../lib/styles.js'
import { getMuscleGroupColor, getMuscleGroupName } from '@gym/shared'

function ExerciseSearchBar({ search, onSearchChange, muscleGroups, selectedMuscleGroup, onMuscleGroupChange, autoFocus = false }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const selectedGroup = muscleGroups?.find(g => g.id === selectedMuscleGroup)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleSelect = (value) => {
    onMuscleGroupChange(value)
    setIsOpen(false)
  }

  return (
    <>
      <div className="relative mb-3">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: colors.textSecondary }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('exercise:searchPlaceholder')}
          className="w-full p-3 pl-10 rounded-lg text-base"
          style={inputStyle}
          autoFocus={autoFocus}
        />
      </div>

      <div className="relative mb-3" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-3 rounded-lg text-base flex items-center gap-2"
          style={{
            backgroundColor: colors.bgTertiary,
            border: `1px solid ${colors.border}`,
            color: selectedGroup ? colors.textPrimary : colors.textSecondary,
          }}
        >
          {selectedGroup && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getMuscleGroupColor(selectedGroup.name) }}
            />
          )}
          <span className="flex-1 text-left truncate">
            {selectedGroup ? getMuscleGroupName(selectedGroup) : t('common:labels.all')}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: colors.textSecondary }}
          />
        </button>

        {isOpen && (
          <div
            className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden shadow-lg"
            style={{
              backgroundColor: colors.bgTertiary,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div className="max-h-64 overflow-y-auto">
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full px-3 py-2.5 flex items-center gap-2 text-sm text-left hover:opacity-80"
                style={{
                  backgroundColor: !selectedMuscleGroup ? colors.accentBgSubtle : 'transparent',
                  color: !selectedMuscleGroup ? colors.accent : colors.textSecondary,
                }}
              >
                {t('common:labels.all')}
              </button>
              {muscleGroups?.map(group => {
                const isSelected = selectedMuscleGroup === group.id
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleSelect(group.id)}
                    className="w-full px-3 py-2.5 flex items-center gap-2 text-sm text-left hover:opacity-80"
                    style={{
                      backgroundColor: isSelected ? colors.accentBgSubtle : 'transparent',
                      color: isSelected ? colors.accent : colors.textPrimary,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getMuscleGroupColor(group.name) }}
                    />
                    {getMuscleGroupName(group)}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default ExerciseSearchBar
