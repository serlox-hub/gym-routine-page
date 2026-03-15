# Testing Patterns

**Analysis Date:** 2026-03-15

## Test Framework

**Runner:**
- Vitest 4.0.15
- Config: `vite.config.js` (test section)
- Environment: jsdom (browser DOM simulation)
- Setup file: `src/test/setup.js` (imports `@testing-library/jest-dom`)

**Assertion Library:**
- Testing Library assertions (via jest-dom): `expect(element).toBeInTheDocument()`
- Vitest expect: `expect(value).toBe(expected)`

**Run Commands:**
```bash
npm run test           # Run tests (watch mode)
npm run test:run       # Run tests once
npm run test:coverage  # Run tests with coverage report
npm run lint           # Check linting (separate from tests)
npm run check          # Run lint + test:run + e2e tests
```

## Test File Organization

**Location:**
- Co-located with source files (same directory)

**Naming Convention:**
- Utility tests: `camelCase.test.js` — `dateUtils.test.js`, `arrayUtils.test.js`
- Component tests: `PascalCase.test.jsx` — `Modal.test.jsx`, `BodyWeightModal.test.jsx`
- Hook tests: `camelCase.test.js` — `useWorkout.test.js`
- Store tests: `camelCaseStore.test.js` — `workoutStore.test.js`

**File Distribution:**
```
src/
├── lib/
│   ├── dateUtils.js
│   ├── dateUtils.test.js        ← co-located
│   ├── arrayUtils.js
│   ├── arrayUtils.test.js        ← co-located
│   ├── validation.js
│   └── validation.test.js        ← co-located
├── components/
│   ├── ui/
│   │   ├── Modal.jsx
│   │   └── Modal.test.jsx        ← co-located
│   └── BodyWeight/
│       ├── BodyWeightModal.jsx
│       └── BodyWeightModal.test.jsx  ← co-located
├── hooks/
│   ├── useWorkout.js
│   └── useWorkout.test.js        ← co-located
└── stores/
    ├── workoutStore.js
    └── workoutStore.test.js      ← co-located
```

## Test Structure

**Suite Organization:**
```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ComponentName from './ComponentName.jsx'

describe('ComponentName', () => {
  describe('renderizado', () => {
    it('renders correctly', () => {
      render(<ComponentName />)
      expect(screen.getByText('text')).toBeInTheDocument()
    })
  })

  describe('comportamiento', () => {
    it('handles interaction', () => {
      const { result } = renderHook(() => useHook())
      // ... test
    })
  })
})
```

**Patterns Observed:**

1. **Grouping by functionality:** Tests use nested `describe()` blocks by feature/behavior
   - `describe('renderizado', () => { ... })` — Rendering tests
   - `describe('comportamiento', () => { ... })` — Behavior/interaction tests
   - `describe('formSubmit', () => { ... })` — Form submission tests
   - `describe('posicionamiento', () => { ... })` — Layout tests

2. **Spanish test descriptions:** All `it()` descriptions are in Spanish
   - `it('no renderiza nada cuando isOpen es false')`
   - `it('llama onSubmit con datos correctos')`
   - `it('calcula diferencia de 0 días para misma fecha')`

3. **Descriptive test names:** Full sentences describing expected behavior
   - ✓ `'formatea fecha en formato largo'`
   - ✓ `'botón registrar se habilita con peso válido'`
   - ✗ Not abbreviated or vague names

## Mocking

**Framework:** Vitest built-in `vi` mock utilities

**Store Mocking Pattern (Zustand):**
```javascript
// Mock entire store module
vi.mock('../stores/workoutStore.js', async () => {
  const actual = await vi.importActual('../stores/workoutStore.js')
  return {
    default: actual.default,
  }
})

// Reset state before each test
beforeEach(() => {
  useWorkoutStore.setState({
    restTimerActive: false,
    restTimerEndTime: null,
    restTimeInitial: 0,
  })
})
```

**Function Mocking:**
```javascript
// Create mock function
const mockOnClose = vi.fn()
const mockOnSubmit = vi.fn()

// Pass to component
render(<Modal isOpen={true} onClose={mockOnClose} />)

// Verify calls
expect(mockOnClose).toHaveBeenCalledTimes(1)

// Clear between tests
beforeEach(() => {
  vi.clearAllMocks()
})
```

**Fake Timers (for time-dependent tests):**
```javascript
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})
```

**What to Mock:**
- Store state mutations — allows isolated testing
- API calls — handled at hook level via TanStack Query
- Time/Date functions — when testing date-sensitive logic
- External events (mouseDown, change, etc.)

**What NOT to Mock:**
- Pure utility functions — test them directly without mocks
- React components (unless testing error boundaries)
- Basic DOM elements (let Testing Library handle them)

## Fixtures and Factories

**Test Data Pattern:**
Most tests use inline test data rather than external factories:

```javascript
// Inline test data
const sets = [
  { weight: 100, reps_completed: 10 },
  { weight: 100, reps_completed: 8 },
  { weight: 90, reps_completed: 8 },
]
expect(calculateTotalVolume(sets)).toBe(2520)

// Default form objects
const DEFAULT_FORM = {
  name: '',
  measurement_type: MeasurementType.WEIGHT_REPS,
  weight_unit: 'kg',
  time_unit: 's',
  distance_unit: 'm',
  instructions: '',
}
```

**No dedicated fixtures directory** — Test data created as needed in test files

**Location:** Inline in test files (`.test.js`, `.test.jsx`)

## Coverage

**Requirements:** No explicit minimum enforced in config

**View Coverage:**
```bash
npm run test:coverage
```

**Current Coverage State:**
- Utilities heavily tested (dateUtils, arrayUtils, validation, calculations)
- Components selectively tested (UI primitives, critical modals)
- Hooks tested where logic is complex (useWorkout, useRestTimer)
- Store tested for state mutations

**Test Examples by Coverage Level:**

High Coverage (100%+):
- `dateUtils.test.js` — All functions tested including edge cases
- `arrayUtils.test.js` — Comprehensive array manipulation tests
- `workoutCalculations.test.js` — All calculation formulas tested
- `validation.test.js` — All validation rules tested

Medium Coverage:
- `Modal.test.jsx` — Rendering + interaction + edge cases
- `BodyWeightModal.test.jsx` — Form behavior tested
- `useWorkout.test.js` — Timer logic tested

## Test Types

**Unit Tests:**
- Scope: Individual utility functions, pure calculations
- Approach: Test function with multiple input combinations
- Location: `src/lib/*.test.js`
- Examples: `dateUtils.test.js`, `workoutCalculations.test.js`

**Component Tests:**
- Scope: Component rendering and user interactions
- Approach: Render with React Testing Library, query by role/text, simulate events
- Location: `src/components/**/*.test.jsx`
- Examples: `Modal.test.jsx`, `BodyWeightModal.test.jsx`

**Hook Tests:**
- Scope: Custom hook logic and state management
- Approach: Use `renderHook()` from Testing Library, wrap engine hooks
- Location: `src/hooks/*.test.js`
- Examples: `useWorkout.test.js`

**E2E Tests:**
- Framework: Playwright (not actively running in this analysis)
- Config: `playwright.config.js` (if exists)
- Commands: `npm run test:e2e`, `npm run test:e2e:ui`

## Common Patterns

**Async Testing:**
```javascript
// Using act() for state updates
import { act } from '@testing-library/react'

it('updates timer state', () => {
  const { result } = renderHook(() => useRestTimer())

  act(() => {
    useWorkoutStore.getState().startRestTimer(60)
  })

  expect(result.current.isActive).toBe(true)
})

// For async mutations
it('calls onSuccess after mutation', async () => {
  const { result } = renderHook(() => useCreateRoutine())

  await act(async () => {
    await result.current.mutateAsync(routineData)
  })

  expect(queryClient.getQueryData([QUERY_KEYS.ROUTINES])).toBeDefined()
})
```

**Error Testing:**
```javascript
it('shows error message on invalid input', () => {
  const { valid, error } = validateSignupForm({
    email: 'invalid',
    password: '',
    confirmPassword: ''
  })

  expect(valid).toBe(false)
  expect(error).toBe('Por favor completa todos los campos')
})

it('displays ErrorMessage component on error', () => {
  render(<Modal isOpen={true} error="Algo salió mal" />)
  expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
})
```

**Query Testing (TanStack Query hooks):**
```javascript
// Hooks with queries are tested at component level
it('loads data from useRoutines hook', () => {
  const { data, isLoading } = renderHook(() => useRoutines())

  // Initially loading
  expect(isLoading).toBe(true)

  // Wait for data
  waitFor(() => {
    expect(isLoading).toBe(false)
    expect(data).toBeDefined()
  })
})
```

**DOM Queries (React Testing Library):**
```javascript
// Query by role (preferred)
screen.getByRole('button', { name: /registrar/i })

// Query by placeholder
screen.getByPlaceholderText(/75\.5/i)

// Query by text
screen.getByText(/peso \(kg\)/i)

// Check non-existence
expect(screen.queryByText('text')).not.toBeInTheDocument()

// Multiple elements
screen.getAllByRole('button')
```

**Store State Testing:**
```javascript
it('updates store state correctly', () => {
  // Arrange
  useWorkoutStore.setState({
    restTimerActive: true,
    restTimerEndTime: Date.now() + 30000,
    restTimeInitial: 60,
  })

  // Act
  const { result } = renderHook(() => useRestTimer())

  // Assert
  expect(result.current.progress).toBe(50)
})
```

## Test Isolation

**Between Test Isolation:**
- Mocks cleared with `vi.clearAllMocks()` in `beforeEach()`
- Store state reset with `setState()` in `beforeEach()`
- Fake timers reset to real timers in `afterEach()`

**Test Independence:**
- No shared state between tests
- Each test creates its own data (no global fixtures)
- Mocks reset before each test

---

*Testing analysis: 2026-03-15*
