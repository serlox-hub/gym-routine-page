export function getFeedbackCounts(feedback) {
  const list = feedback || []
  return {
    pending: list.filter(f => !f.resolved_at).length,
    all: list.length,
  }
}

export function filterFeedback(feedback, filter) {
  const list = feedback || []
  if (filter === 'pending') return list.filter(f => !f.resolved_at)
  return list
}
