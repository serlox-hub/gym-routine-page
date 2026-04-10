import { useState, useEffect } from 'react'
import { View, Text, Pressable, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Plus, Pin } from 'lucide-react-native'
import { useRoutines } from '../hooks/useRoutines'
import { LoadingSpinner, ErrorMessage } from '../components/ui'
import { RoutineCard } from '../components/Routine'
import { NewRoutineFlow } from '../components/Home'
import { colors, design } from '../lib/styles'

export default function RoutinesScreen({ navigation, route }) {
  const { t } = useTranslation()
  const { data: routines, isLoading, error, refetch, isRefetching } = useRoutines()
  const [showNewRoutineModal, setShowNewRoutineModal] = useState(false)

  useEffect(() => {
    if (route?.params?.openNewRoutine) {
      setShowNewRoutineModal(true)
      navigation.setParams({ openNewRoutine: undefined })
    }
  }, [route?.params?.openNewRoutine, navigation])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const pinnedRoutine = routines?.find(r => r.is_favorite)
  const otherRoutines = routines?.filter(r => !r.is_favorite) || []

  const renderHeader = () => (
    <View style={{ gap: 12 }}>
      {/* Pinned to Home section */}
      {pinnedRoutine && (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pin size={14} color={colors.success} />
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              {t('common:home.pinnedToHome')}
            </Text>
          </View>
          <RoutineCard
            routine={pinnedRoutine}
            isPinned
            onPress={() => navigation.navigate('RoutineDetail', { routineId: pinnedRoutine.id })}
          />
        </View>
      )}

      {/* All Routines label */}
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
        {t('routine:allRoutines')}
      </Text>

      {/* New Routine button */}
      <Pressable
        onPress={() => setShowNewRoutineModal(true)}
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.border,
          height: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Plus size={18} color={colors.success} />
        <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>
          {t('routine:new')}
        </Text>
      </Pressable>
    </View>
  )

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <FlatList
        data={otherRoutines}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <RoutineCard
            routine={item}
            onPress={() => navigation.navigate('RoutineDetail', { routineId: item.id })}
          />
        )}
        ListHeaderComponent={renderHeader}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: design.tabContentPaddingBottom }}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponentStyle={{ marginBottom: 12 }}
      />

      <NewRoutineFlow
        isOpen={showNewRoutineModal}
        onClose={() => setShowNewRoutineModal(false)}
        navigation={navigation}
      />
    </SafeAreaView>
  )
}
