import { useCallback, useEffect, useRef } from 'react'
import { ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { getMuscleGroupColor, getMuscleGroupName, getRevealScrollOffset } from '@gym/shared'
import { design } from '../../lib/styles'
import FilterChip from './FilterChip'

const CHIP_GAP = 6

/**
 * Muscle group filter, always on screen under the search field: "All" and then every group, in a
 * row that scrolls sideways. One tap picks a group; a tap on the picked one goes back to all.
 */
export default function MuscleGroupFilterRow({ muscleGroups, selectedMuscleGroup, onMuscleGroupChange }) {
  const { t } = useTranslation()
  const scrollRef = useRef(null)
  const viewportWidthRef = useRef(0)
  const contentWidthRef = useRef(0)
  const chipLayoutsRef = useRef(new Map())
  // The picker can open already filtered (replacing a chest exercise) on a chip past the right
  // edge. The chip to bring into view is the one picked when the groups first arrive, and it is
  // done once, so a tap never moves the row. undefined = groups not there yet, null = none.
  const revealRef = useRef({ groupId: undefined, done: false })

  // Layout arrives in pieces (row, content, chips) and in no fixed order, so every piece retries.
  const revealPickedChip = useCallback(() => {
    const reveal = revealRef.current
    if (reveal.done || reveal.groupId === undefined) return
    if (reveal.groupId === null) {
      reveal.done = true
      return
    }
    const chip = chipLayoutsRef.current.get(reveal.groupId)
    const contentSize = contentWidthRef.current
    // A content width older than the chips (only "All" measured) would clamp the scroll short.
    if (!chip || !viewportWidthRef.current || contentSize < chip.x + chip.width) return
    reveal.done = true
    const offset = getRevealScrollOffset({
      itemStart: chip.x,
      itemSize: chip.width,
      viewportSize: viewportWidthRef.current,
      contentSize,
    })
    if (offset !== null) scrollRef.current?.scrollTo({ x: offset, animated: false })
  }, [])

  useEffect(() => {
    if (revealRef.current.groupId !== undefined || !muscleGroups?.length) return
    revealRef.current.groupId = selectedMuscleGroup ?? null
    revealPickedChip()
  }, [muscleGroups, selectedMuscleGroup, revealPickedChip])

  const handleGroupPress = groupId => onMuscleGroupChange(groupId === selectedMuscleGroup ? null : groupId)

  // keyboardShouldPersistTaps: with the search keyboard open, a tap picks the group at once and
  // the keyboard stays. The row is as tall as a tap target and each chip fills it, instead of a
  // hitSlop: on Android a hitSlop sticking out of a horizontal ScrollView gets no touches.
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onLayout={event => {
        viewportWidthRef.current = event.nativeEvent.layout.width
        revealPickedChip()
      }}
      onContentSizeChange={width => {
        contentWidthRef.current = width
        revealPickedChip()
      }}
      style={{ flexGrow: 0, flexShrink: 0, height: design.minTouchTarget, marginTop: 4 }}
      contentContainerStyle={{ gap: CHIP_GAP }}
    >
      <FilterChip
        label={t('common:labels.all')}
        isSelected={!selectedMuscleGroup}
        onPress={() => onMuscleGroupChange(null)}
        fillTouchTarget
      />
      {muscleGroups?.map(group => (
        <FilterChip
          key={group.id}
          label={getMuscleGroupName(group)}
          dot={getMuscleGroupColor(group.name)}
          isSelected={selectedMuscleGroup === group.id}
          onPress={() => handleGroupPress(group.id)}
          onLayout={event => {
            chipLayoutsRef.current.set(group.id, event.nativeEvent.layout)
            revealPickedChip()
          }}
          fillTouchTarget
        />
      ))}
    </ScrollView>
  )
}
