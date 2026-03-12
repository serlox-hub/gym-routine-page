import { View, Text, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function BottomActions({ primary, secondary, center }) {
  const insets = useSafeAreaInsets()
  const hasSecondary = !!secondary

  return (
    <View
      className="bg-surface border-t border-border px-4 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View className={hasSecondary ? 'flex-row gap-3' : ''}>
        {secondary && (
          <Pressable
            onPress={secondary.onClick}
            disabled={secondary.disabled}
            className={`flex-1 py-2.5 px-4 rounded-lg items-center ${secondary.disabled ? 'opacity-50' : 'active:opacity-70'}`}
            style={{
              backgroundColor: secondary.danger ? 'rgba(248, 81, 73, 0.15)' : '#21262d',
            }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: secondary.danger ? '#f85149' : '#e6edf3' }}
            >
              {secondary.label}
            </Text>
          </Pressable>
        )}
        {center}
        {primary && (
          <Pressable
            onPress={primary.onClick}
            disabled={primary.disabled}
            className={`py-2.5 px-4 rounded-lg items-center ${hasSecondary ? 'flex-1' : 'w-full'} ${primary.disabled ? 'opacity-50' : 'active:opacity-70'}`}
            style={{ backgroundColor: '#58a6ff' }}
          >
            <Text className="text-sm font-medium text-white">{primary.label}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
