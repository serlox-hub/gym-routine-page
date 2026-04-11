# UI Migration Status

## Design System Rules

When adapting a screen to the new theme, follow these rules:

### Layout
- **No Card wrappers** for sections — use open sections with label headers
- **Section labels**: `fontSize: 12, fontWeight: 600, color: colors.textSecondary`
- **Field labels**: `fontSize: 13, fontWeight: 500, color: colors.textPrimary`
- **Descriptions**: `fontSize: 11, color: colors.textMuted`
- **Spacing**: `gap: 24` between sections, `gap: 16` within sections, `gap: 8` between items
- **Page padding**: `px-6 pt-4 pb-20` (web), `px-6` (native)

### Colors
- **Active/selected state**: `colors.success` (lime `#BEFF00`) — NEVER `colors.accent` (cyan)
- **Active text on lime bg**: `colors.bgPrimary` (dark) — NOT white
- **Inactive state**: `colors.bgTertiary` bg + `colors.textSecondary` text
- **No hardcoded hex/rgba** — always use `colors.X` tokens
- **Danger actions**: `colors.dangerBg` bg + `colors.danger` text

### Interactive elements
- **Buttons/pills active**: `backgroundColor: colors.success, color: colors.bgPrimary`
- **Kebab menu**: no background, `color: colors.textPrimary`
- **Edit action in kebab**: `accent: true` (shows in lime)
- **Icons**: use `color` prop, not `style={{ color }}` (lucide-react)
- **Touch targets**: min `p-2` (padding 8px) for clickable icons
- **Feedback**: web `hover:opacity-80`, native `active:opacity-70`

### Navigation
- **PageHeader**: `< Back` label (textPrimary), no title in view mode for detail screens
- **Chevrons**: ChevronDown/ChevronUp for expand, ChevronRight for navigation
- **Play icon**: lime, for starting workouts

### Inputs (edit mode)
- **Style**: border-bottom only, no bg, no side borders (`borderBottom: 1px solid colors.border`)
- **Font**: 12-13px, centered for numeric inputs
- **Labels**: 10-11px muted, close to input
- **Auto-save onBlur** — no save/cancel buttons

### Modals
- **z-index**: 60 (above tab bar at 50)
- **Bottom sheets**: `maxHeight: 85vh` (web)
- **No X close button** — close by tapping overlay
- **No drag handle**

### Sets display (view mode)
- **Set number**: text muted, no circular badge
- **Value**: textPrimary, 13px
- **PR indicator**: Trophy icon + "PR" inline after value, warning color
- **RIR**: number in textMuted, textAlign center
- **Notes/video icons**: muted, opacity-70, p-2 with -my-2 to not affect row height
- **Dropset**: "D" instead of number

### i18n
- All user-facing text via `t('namespace:key')`
- Both `es/` and `en/` JSON files updated
- Cross-platform: same `t()` keys in web and native equivalents

## Migrated

| Screen | Commit | Notes |
|--------|--------|-------|
| Home | `870ada7` | Full redesign web + native |
| Routines | `016b533` | RoutineCard shared, Pinned/All sections |
| Routine Detail | `822966c` | Info section, pin toggle, DayCard, ExerciseCard |
| History | `a637d6f` | Compact header, unified sets, subtle calendar |
| Session Edit Mode | `1d118ba` | Auto-save, inline inputs, Done button |
| Body Metrics | `474dd21` | Adapted to new theme |
| Preferences | latest | Open sections, lime selection buttons, no Cards |

## Pending (ordered by difficulty)

| # | Screen | Difficulty | Notes |
|---|--------|-----------|-------|
| 1 | Admin Users | Easy | Simple list, admin only |
| 2 | New Routine | Easy | Simple form (name, description) |
| 3 | Login / Signup | Medium | Auth forms. Inputs + buttons + color tokens |
| 4 | Forgot / Reset Password | Medium | Simple forms with email flow |
| 5 | Free Workout Session | Medium-High | Shares components with WorkoutSession |
| 6 | Workout Session | High | Most complex screen — sets, timer, supersets, notes, video |
| 7 | Landing | High | Marketing page with gradients and animations. Own style — evaluate if needs migration |

## Removed

| Screen | Reason |
|--------|--------|
| Exercises | Orphan — no navigation led to it. Exercise management done via routine editor |
| Exercise Progress | Redundant — same content as ExerciseHistoryModal |
| ExerciseUsageModal | Only used by Exercises page |
