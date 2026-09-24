import { Navigate, useParams } from 'react-router-dom'

// `/routine/:id/edit` ya no existe: el detalle es modeless (issue #85). La ruta se queda solo como
// redirección porque `App.jsx` no tiene catch-all, y un marcador o una entrada vieja del historial
// se quedarían en una pantalla en blanco. `replace` para no dejar la URL muerta en el historial.
function RoutineEditRedirect() {
  const { routineId } = useParams()

  return <Navigate to={`/routine/${routineId}`} replace />
}

export default RoutineEditRedirect
