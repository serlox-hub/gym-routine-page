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

### iOS — Build de debug (cuenta Apple gratuita)

Instalar la app en un iPhone fisico para desarrollo. Usa Expo Dev Client (no Expo Go).

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

### iOS — Build de release (EAS Build)

Para generar builds de produccion o preview se usa EAS Build. Requiere cuenta de Expo y Apple Developer Program para distribucion.

```bash
cd apps/gym-native

# Preview (distribucion interna, dispositivo fisico)
eas build --platform ios --profile preview

# Produccion (App Store)
eas build --platform ios --profile production

# Enviar a App Store
eas submit --platform ios
```

Los perfiles de build estan en `apps/gym-native/eas.json`.

### Android — Build con EAS

```bash
cd apps/gym-native

# Preview (APK para instalar directamente)
eas build --platform android --profile preview

# Produccion (AAB para Google Play)
eas build --platform android --profile production
```
