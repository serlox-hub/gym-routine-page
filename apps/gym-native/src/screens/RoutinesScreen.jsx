import { useState, useEffect } from 'react'
import { View, Text, Pressable, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Plus, Pin } from 'lucide-react-native'
import { useRoutines, useSetFavoriteRoutine } from '../hooks/useRoutines'
import { LoadingSpinner, ErrorMessage, Card, TruncatedText } from '../components/ui'
import { NewRoutineFlow } from '../components/Home'
import { colors } from '../lib/styles'

function RoutineItem({ routine, navigation, setFavoriteMutation }) {
  const { t } = useTranslation()
  return (
    <Card
      className="p-3 mb-2"
      onPress={() => navigation.navigate('RoutineDetail', { routineId: routine.id })}
    >
      <View className={`flex-row justify-between gap-3 ${routine.description || routine.goal ? 'items-start' : 'items-center'}`}>
        <View className="flex-1">
          <Text className="text-primary font-medium text-sm">{routine.name}</Text>
          {routine.description && (
            <TruncatedText
              text={routine.description}
              className="text-xs mt-1"
              style={{ color: colors.textSecondary }}
            />
          )}
          {routine.goal && (
            <Text className="text-xs mt-1">
              <Text style={{ color: colors.success }}>{t('routine:goal')}: </Text>
              <Text className="text-secondary">{routine.goal}</Text>
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => {
            setFavoriteMutation.mutate({
              routineId: routine.id,
              isFavorite: !routine.is_favorite,
            })
          }}
          className="p-1"
        >
          <Pin
            size={18}
            color={routine.is_favorite ? colors.success : colors.textSecondary}
            fill={routine.is_favorite ? colors.success : 'none'}
          />
        </Pressable>
      </View>
    </Card>
  )
}

export default function RoutinesScreen({ navigation, route }) {
  const { t } = useTranslation()
  const { data: routines, isLoading, error, refetch, isRefetching } = useRoutines()
  const setFavoriteMutation = useSetFavoriteRoutine()
  const [showNewRoutineModal, setShowNewRoutineModal] = useState(false)

  useEffect(() => {
    if (route?.params?.openNewRoutine) {
      setShowNewRoutineModal(true)
      navigation.setParams({ openNewRoutine: undefined })
    }
  }, [route?.params?.openNewRoutine, navigation])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const renderHeader = () => (
    <Card
      className="p-3 mb-2"
      style={{ borderStyle: 'dashed' }}
      onPress={() => setShowNewRoutineModal(true)}
    >
      <View className="flex-row items-center gap-2 justify-center">
        <Plus size={18} color={colors.textSecondary} />
        <Text className="text-secondary text-sm">{t('routine:new')}</Text>
      </View>
    </Card>
  )

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-4 pt-2 pb-3">
        <Text className="text-primary text-xl font-bold">{t('common:nav.routines')}</Text>
      </View>

      <FlatList
        data={routines}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <RoutineItem
            routine={item}
            navigation={navigation}
            setFavoriteMutation={setFavoriteMutation}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        refreshing={isRefetching}
        onRefresh={refetch}
      />

      <NewRoutineFlow
        isOpen={showNewRoutineModal}
        onClose={() => setShowNewRoutineModal(false)}
        navigation={navigation}
      />
    </SafeAreaView>
  )
}
