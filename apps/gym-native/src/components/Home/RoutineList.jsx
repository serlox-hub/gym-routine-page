import { View, Text, Pressable, FlatList } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus, Pin } from 'lucide-react-native'
import { useSetFavoriteRoutine } from '../../hooks/useRoutines'
import { Card, TruncatedText } from '../ui'
import { colors } from '../../lib/styles'

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

function RoutineList({ routines, navigation, onNewRoutine, ListHeaderComponent, refreshing, onRefresh }) {
  const { t } = useTranslation()
  const setFavoriteMutation = useSetFavoriteRoutine()

  const renderHeader = () => (
    <>
      {ListHeaderComponent}
      <Text className="text-secondary text-sm font-medium mb-3">{t('routine:myRoutines')}</Text>
      <Card
        className="p-3 mb-2"
        style={{ borderStyle: 'dashed' }}
        onPress={onNewRoutine}
      >
        <View className="flex-row items-center gap-2 justify-center">
          <Plus size={18} color={colors.textSecondary} />
          <Text className="text-secondary text-sm">{t('routine:new')}</Text>
        </View>
      </Card>
    </>
  )

  return (
    <FlatList
      data={routines}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <RoutineItem
          routine={item}
          navigation={navigation}
          setFavoriteMutation={setFavoriteMutation}
        />
      )}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  )
}

export default RoutineList
