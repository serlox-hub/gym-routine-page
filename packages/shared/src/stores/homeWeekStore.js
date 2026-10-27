import { create } from 'zustand'
import { shouldResetViewedWeek } from '../lib/homeUtils.js'

/**
 * Week shown by Home's streak card and stats row. A module-level store, not a factory: it has no
 * platform dependency. Memory only on purpose, so a reload or an app restart starts on the current
 * week. Components read the offset through useHomeCycleOffset(), never raw: that one already
 * applies the reset rule on the first render after returning to Home.
 */
export const useHomeWeekStore = create((set, get) => ({
  cycleOffset: 0,
  // Epoch ms when the user last left Home; null while on Home or before ever leaving it
  leftAt: null,

  setCycleOffset: (cycleOffset) => set({ cycleOffset }),

  // Keeps the first leave since the last enter: a second one (the app going to the background
  // with the workout overlay open, an unmount after a blur) must not restart the 15 minutes
  leaveHome: (now = Date.now()) => set(state => ({ leftAt: state.leftAt ?? now })),

  enterHome: (now = Date.now(), weekStartDay = 'monday') => {
    const reset = shouldResetViewedWeek(get().leftAt, now, weekStartDay)
    set(reset ? { cycleOffset: 0, leftAt: null } : { leftAt: null })
  },
}))
