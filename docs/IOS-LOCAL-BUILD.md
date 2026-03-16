# Build local iOS - Cuenta gratuita de Apple

Guía para instalar Diario Gym en un iPhone físico sin Apple Developer Program ($99/año).

## Requisitos previos

- Mac con Xcode instalado (App Store)
- iPhone conectado por cable USB al Mac
- Apple ID (cuenta gratuita)
- CocoaPods instalado (`sudo gem install cocoapods` o `brew install cocoapods`)

## Limitaciones con cuenta gratuita

- La app **expira cada 7 días** — hay que reinstalar desde Xcode
- Máximo 3 apps simultáneas firmadas con cuenta gratuita
- Sin notificaciones push
- Sin distribución a otros (no TestFlight)

## Pasos

### 1. Generar proyecto nativo

```bash
cd apps/gym-native
npx expo prebuild --platform ios
```

Esto genera la carpeta `ios/` con el proyecto Xcode a partir de `app.json`.

### 2. Instalar dependencias nativas

```bash
cd ios
pod install
cd ..
```

### 3. Abrir en Xcode

```bash
open ios/DiarioGym.xcworkspace
```

> Importante: abrir `.xcworkspace`, NO `.xcodeproj`

### 4. Configurar firma en Xcode

1. En el panel izquierdo, selecciona el proyecto **DiarioGym**
2. Ve a la pestaña **Signing & Capabilities**
3. Marca **Automatically manage signing**
4. En **Team**, selecciona tu Apple ID personal
5. Si el bundle identifier da conflicto, Xcode puede pedir cambiarlo — acepta

### 5. Seleccionar dispositivo

1. Conecta tu iPhone por cable USB
2. En la barra superior de Xcode, selecciona tu iPhone como destino (en vez de simulador)
3. Si es la primera vez, espera a que Xcode prepare el dispositivo

### 6. Compilar e instalar

1. Pulsa **▶ (Run)** o `Cmd + R`
2. Xcode compilará el proyecto y lo instalará en tu iPhone
3. La primera vez tarda varios minutos

### 7. Confiar en el perfil de desarrollador

En tu iPhone:

1. Ve a **Ajustes → General → VPN y gestión de dispositivos**
2. Busca tu Apple ID bajo "App del desarrollador"
3. Pulsa **Confiar**
4. Abre la app desde la pantalla de inicio

## Reinstalación (cada 7 días)

Cuando la app expire:

1. Conecta el iPhone al Mac
2. Abre Xcode con el workspace
3. Pulsa **▶** de nuevo
4. No hace falta repetir el paso de "confiar" salvo que cambies el perfil

## Actualizar la app con cambios nuevos

Si has hecho cambios en el código de `apps/gym-native/`:

```bash
cd apps/gym-native

# Si cambiaste app.json, plugins o dependencias nativas:
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..

# Si solo cambiaste código JS/JSX:
# Basta con pulsar ▶ en Xcode (el bundler recarga automáticamente)
```

## Solución de problemas

### "Untrusted Developer"
→ Ajustes → General → VPN y gestión de dispositivos → Confiar

### "Could not launch app" / provisioning profile error
→ En Xcode: Signing & Capabilities → cambiar el bundle identifier (ej: `com.diariogym.app.dev`)

### Build falla con error de CocoaPods
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### "No code signing identities found"
→ Xcode → Settings → Accounts → añadir tu Apple ID
