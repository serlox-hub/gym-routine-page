import Badge from './Badge'

export default function PlanBadge({ isPremium }) {
  return (
    <Badge variant={isPremium ? 'success' : 'default'}>
      {isPremium ? 'Premium' : 'Standard'}
    </Badge>
  )
}
