import { View, Pressable } from 'react-native'

export default function Card({ children, className = '', onPress, style = {} }) {
  const Component = onPress ? Pressable : View

  return (
    <Component
      onPress={onPress}
      className={`rounded-lg bg-surface-card border border-border ${className}`}
      style={style}
    >
      {children}
    </Component>
  )
}
