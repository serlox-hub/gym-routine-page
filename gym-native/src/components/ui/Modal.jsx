import { Modal as RNModal, View, Pressable, KeyboardAvoidingView, Platform } from 'react-native'

export default function Modal({
  isOpen,
  onClose,
  children,
  position = 'center',
  className = '',
}) {
  if (!isOpen) return null

  const isBottom = position === 'bottom'

  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType={isBottom ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Pressable
          onPress={onClose}
          className={`flex-1 ${isBottom ? 'justify-end' : 'justify-center items-center p-4'}`}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className={`bg-surface-card border border-border ${isBottom ? 'w-full rounded-t-2xl' : 'w-full rounded-lg'} ${className}`}
            style={{ maxWidth: isBottom ? undefined : 400 }}
          >
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  )
}
