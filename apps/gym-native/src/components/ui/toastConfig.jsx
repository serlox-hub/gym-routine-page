import { View, Text, ActivityIndicator } from 'react-native'
import { Check, AlertCircle, Info } from 'lucide-react-native'
import { colors } from '../../lib/styles'

const ICONS = {
  success: { Icon: Check, color: colors.success },
  error: { Icon: AlertCircle, color: colors.danger },
  info: { Icon: Info, color: colors.accent },
  loading: { Icon: null, color: colors.accent },
}

function ToastBase({ type, text1, text2 }) {
  const { Icon, color } = ICONS[type] || ICONS.info

  return (
    <View
      className="flex-row items-center gap-3 mx-4 px-4 py-3 rounded-xl"
      style={{
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      {type === 'loading' ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Icon size={18} color={color} />
      )}
      <View className="flex-1">
        <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
          {text1}
        </Text>
        {text2 && (
          <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
            {text2}
          </Text>
        )}
      </View>
    </View>
  )
}

export const toastConfig = {
  success: (props) => <ToastBase type="success" {...props} />,
  error: (props) => <ToastBase type="error" {...props} />,
  info: (props) => <ToastBase type="info" {...props} />,
  loading: (props) => <ToastBase type="loading" {...props} />,
}
