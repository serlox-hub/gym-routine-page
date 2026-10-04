import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getMuscleGroupColor, getMuscleGroupName, getRevealScrollOffset } from '@gym/shared'
import FilterChip from './FilterChip.jsx'

// A chip must not take the focus from the search field: on Android that closes the keyboard, and
// the tap should only pick the group. On the chips' container, not the scroller, so a mouse can
// still grab the scrollbar.
const keepSearchFieldFocus = event => event.preventDefault()

/**
 * Muscle group filter, always on screen under the search field: "All" and then every group, in a
 * row that scrolls sideways. One tap picks a group; a tap on the picked one goes back to all.
 */
function MuscleGroupFilterRow({ muscleGroups, selectedMuscleGroup, onMuscleGroupChange }) {
  const { t } = useTranslation()
  const scrollerRef = useRef(null)
  const chipsRef = useRef(null)
  const hasRevealedRef = useRef(false)

  // The picker can open already filtered (replacing a chest exercise) on a chip past the right
  // edge. Done once, when the groups first arrive, so a tap never moves the row. Sideways only:
  // scrollIntoView would also scroll the modal and the page behind it.
  useEffect(() => {
    if (hasRevealedRef.current || !muscleGroups?.length) return
    hasRevealedRef.current = true
    const index = muscleGroups.findIndex(g => g.id === selectedMuscleGroup)
    const scroller = scrollerRef.current
    // + 1: "All" is the first chip.
    const chip = index === -1 ? null : chipsRef.current?.children[index + 1]
    if (!scroller || !chip) return
    const chipRect = chip.getBoundingClientRect()
    const offset = getRevealScrollOffset({
      itemStart: chipRect.left - scroller.getBoundingClientRect().left + scroller.scrollLeft,
      itemSize: chipRect.width,
      viewportSize: scroller.clientWidth,
      contentSize: scroller.scrollWidth,
      scrollOffset: scroller.scrollLeft,
    })
    if (offset !== null) scroller.scrollLeft = offset
  }, [muscleGroups, selectedMuscleGroup])

  const handleGroupPress = groupId => onMuscleGroupChange(groupId === selectedMuscleGroup ? null : groupId)

  return (
    <div ref={scrollerRef} className="overflow-x-auto mt-1">
      <div ref={chipsRef} className="flex gap-1.5 w-max" onMouseDown={keepSearchFieldFocus}>
        <FilterChip
          label={t('common:labels.all')}
          isSelected={!selectedMuscleGroup}
          onClick={() => onMuscleGroupChange(null)}
          fillTouchTarget
        />
        {muscleGroups?.map(group => (
          <FilterChip
            key={group.id}
            label={getMuscleGroupName(group)}
            dot={getMuscleGroupColor(group.name)}
            isSelected={selectedMuscleGroup === group.id}
            onClick={() => handleGroupPress(group.id)}
            fillTouchTarget
          />
        ))}
      </div>
    </div>
  )
}

export default MuscleGroupFilterRow
