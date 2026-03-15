import Badge from './Badge'

export default function PlanBadge({ isPremium }) {
  return (
    <Badge variant={isPremium ? 'warning' : 'default'}>
      {isPremium ? 'Premium' : 'Standard'}
    </Badge>
  )
}
