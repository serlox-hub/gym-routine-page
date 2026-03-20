# Diario Gym

Aplicacion de seguimiento de entrenamientos de fuerza. Monorepo con app web (React + Vite) y app movil (Expo + NativeWind) compartiendo logica de negocio via `@gym/shared`.

## Stack

- **Web**: React 18, Vite, Tailwind CSS
- **Mobile**: Expo (managed workflow), NativeWind v4
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Shared**: TanStack Query, Zustand, logica de negocio en `packages/shared`

## Estructura

```
apps/web/            # App web (React + Vite)
apps/gym-native/     # App movil (Expo)
packages/shared/     # Logica compartida (@gym/shared)
```

## Desarrollo local

```bash
npm install

# Web
npm run dev

# Tests
npm run test:shared   # tests de logica compartida
npm run check         # lint + tests + build
```

## Despliegue

### Web

La app web se despliega en Vercel. Cualquier push a `main` genera un deploy automatico.

### Debug vs Release

Las apps moviles se pueden instalar en dos modos:

- **Debug**: la app necesita un servidor de desarrollo (bundler de Expo) corriendo en tu Mac. El codigo JS se carga desde el servidor, lo que permite hot reload y cambios instantaneos. Se instala desde Xcode (iOS) o `adb` (Android). Ideal para desarrollo.
- **Release**: la app es autonoma con el bundle JS incluido. No necesita servidor ni conexion al Mac. Se genera con EAS Build y se distribuye via TestFlight/App Store (iOS) o APK/Google Play (Android).

### iOS — Build de debug (cuenta Apple gratuita)

Instalar la app en un iPhone fisico conectado al Mac. Requiere que el bundler de Expo este corriendo.

**Limitaciones con cuenta gratuita:**
- La app expira cada 7 dias (reinstalar desde Xcode)
- Maximo 3 apps simultaneas firmadas

**Pasos:**

1. Generar proyecto nativo (solo la primera vez o tras cambios en `app.json`/plugins/dependencias nativas):
   ```bash
   cd apps/gym-native
   npx expo prebuild --platform ios
   cd ios && pod install && cd ..
   ```

2. Arrancar el bundler de Expo:
   ```bash
   cd apps/gym-native
   npx expo start --dev-client
   ```

3. Abrir en Xcode (siempre el `.xcworkspace`, NO el `.xcodeproj`):
   ```bash
   open apps/gym-native/ios/DiarioGym.xcworkspace
   ```

4. En Xcode:
   - Conectar iPhone por cable USB
   - Seleccionar el iPhone como destino (dropdown superior)
   - Signing & Capabilities > Automatically manage signing > seleccionar tu Apple ID como Team
   - Pulsar Play (`Cmd+R`)

5. Primera vez en el dispositivo: Ajustes > General > VPN y gestion de dispositivos > confiar en el perfil de desarrollador.

6. La app se abre y conecta al bundler de Expo automaticamente. Si solo cambias JS/JSX, basta con pulsar Play en Xcode — el bundler recarga.

**Solucionar problemas:**
- "Untrusted Developer" > Ajustes > General > Gestion de dispositivos > Confiar
- Provisioning profile error > cambiar bundle identifier en Xcode (ej: `com.diariogym.app.dev`)
- CocoaPods falla > `cd ios && pod deintegrate && pod install`

### Android — Build de debug

Instalar la app de debug en un dispositivo Android conectado por USB.

1. Activar **Opciones de desarrollador** y **Depuracion USB** en el dispositivo Android.

2. Generar proyecto nativo (solo la primera vez o tras cambios en `app.json`/plugins/dependencias nativas):
   ```bash
   cd apps/gym-native
   npx expo prebuild --platform android
   ```

3. Arrancar el bundler e instalar en el dispositivo conectado:
   ```bash
   cd apps/gym-native
   npx expo run:android
   ```
   Esto compila, instala y conecta al bundler automaticamente. La primera vez tarda varios minutos.

### Builds de release (EAS Build)

Builds autonomas que no necesitan servidor de desarrollo. Se generan en la nube con EAS Build. Requiere cuenta de Expo y para iOS tambien Apple Developer Program.

```bash
cd apps/gym-native

# iOS
eas build --platform ios --profile preview      # distribucion interna (TestFlight)
eas build --platform ios --profile production    # App Store
eas submit --platform ios                        # enviar a App Store

# Android
eas build --platform android --profile preview   # APK para instalar directamente
eas build --platform android --profile production # AAB para Google Play
```

Los perfiles de build estan en `apps/gym-native/eas.json`.

### Monitoring de errores (Sentry)

Sentry captura errores de produccion en ambas apps. Plan gratuito: 5K errores/mes, 1 usuario.

**Setup inicial:**

1. Crear cuenta en [sentry.io](https://sentry.io)
2. Crear 2 proyectos: uno React (web) y uno React Native (native)
3. Copiar el DSN de cada proyecto y ponerlo en las env vars:
   - Web: `VITE_SENTRY_DSN` en `apps/web/.env`
   - Native: `EXPO_PUBLIC_SENTRY_DSN` en `apps/gym-native/.env`

**Comportamiento:**

- Solo se activa en produccion (`import.meta.env.PROD` en web, `!__DEV__` en native)
- En desarrollo no envia nada a Sentry
- Si no hay DSN configurado, Sentry no se inicializa (sin errores)

**Dashboard:**

Los errores aparecen en el dashboard de Sentry con:
- Stack trace completo
- Dispositivo, navegador y version de la app
- Frecuencia y usuarios afectados

Acceder en `https://<org>.sentry.io` para ver errores, tendencias y alertas.
