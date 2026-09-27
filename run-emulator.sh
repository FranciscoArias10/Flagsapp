#!/usr/bin/env bash
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
export DISPLAY="${DISPLAY:-:0}"

AVD_NAME="librefree_emu"

echo "=========================================="
echo "📱 Flags++ - Lanzador de Emulador Android"
echo "=========================================="

# 1. Comprobar si ya está encendido el emulador
if adb devices | grep -q "emulator"; then
    echo "✅ El emulador '$AVD_NAME' ya está activo en ADB."
else
    echo "🚀 Iniciando emulador ligero '$AVD_NAME' con aceleración GPU Radeon..."
    rm -f "$HOME/.android/avd/$AVD_NAME.avd/"*.lock 2>/dev/null
    
    # Iniciar como demonio independiente con setsid
    setsid emulator -avd "$AVD_NAME" -gpu host -memory 1536 -no-boot-anim -netdelay none -netspeed full -no-snapshot </dev/null > /tmp/emulator.log 2>&1 &
    
    echo "⏳ Esperando conexión con el emulador..."
    adb wait-for-device
    
    # Flotar ventana en i3 si se usa i3wm
    command -v i3-msg >/dev/null 2>&1 && i3-msg '[class="Emulator"] floating enable' >/dev/null 2>&1
    
    # Esperar a que el sistema operativo Android termine de bootear
    echo "⏳ Esperando arranque completo de Android..."
    while [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; do
        sleep 1
    done
    echo "✅ Android iniciado correctamente!"
fi

# 2. Configurar túnel de puertos para Metro Bundler (8081 y 8082 por si acaso)
adb reverse tcp:8081 tcp:8081 2>/dev/null
adb reverse tcp:8082 tcp:8082 2>/dev/null

echo "🔗 Puertos ADB 8081 y 8082 vinculados a tu máquina local."

# 3. Intentar abrir la app si Metro está activo
METRO_PORT=""
if ss -tulpn 2>/dev/null | grep -q ":8081"; then
    METRO_PORT="8081"
elif ss -tulpn 2>/dev/null | grep -q ":8082"; then
    METRO_PORT="8082"
fi

if [ -n "$METRO_PORT" ]; then
    echo "📲 Metro detectado en puerto $METRO_PORT. Abriendo Flags++ en Expo Go..."
    adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:$METRO_PORT" >/dev/null 2>&1
    echo "🎉 ¡Flags++ lanzada en el emulador!"
else
    echo "💡 Metro no parece estar corriendo aún. Inicia tu app con 'npx expo start -c' y presiona 'a'."
fi

echo "=========================================="
adb devices
