# 📌 Lista de Pendientes y Roadmap — Flags++ 🌍✨

Documento de seguimiento de tareas, mejoras pendientes y nuevas funcionalidades para **Flags++**.

---

## 🚀 Siguiente Prioridad / En Progreso

- [ ] **Modo Manos Libres y Respuesta por Voz (Paso 2: STT y Micrófono Abierto)**:
  - Integración de reconocimiento de voz en streaming (`expo-speech-recognition`) para responder por micrófono sin tocar la pantalla con validación fonética instantánea.
  - Requiere Development Build (`npx expo run:android` / EAS Build).
- [ ] **Filtro por Dificultad en el Atlas**:
  - Filtrar países por dificultad (Fácil, Intermedio, Experto) mediante chips interactivos en el Atlas.

---

## ⏳ Tareas Pendientes Futuras (Backlog)

---

## ✅ Tareas Completadas

- [x] **Voz del Locutor y Lectura de Preguntas (Paso 1: TTS con `expo-speech`)**:
  - Integración de `expo-speech` optimizada para Expo SDK 57 y 100% compatible con Expo Go.
  - Servicio `speechService` con pronunciación bilingüe (`es-ES` y `en-US`), cadencia rápida (`rate: 1.1x`), y cancelación inmediata (`Speech.stop()`) al responder, salir o agotar tiempo.
  - Conmutador en **Perfil > Ajustes de la Aplicación** (`stats.voiceAnnouncerEnabled`) con sincronización reactiva en `GameContext`.
  - Botón interactivo de altavoz en la tarjeta de pregunta de **Modo Capitales** y **Quiz de Banderas** para encender/apagar la lectura en cualquier momento de la partida.

- [x] **Internacionalización y Soporte Multi-idioma Completo (i18n Español / Inglés)**:
  - Detección automática y reactiva del idioma del dispositivo mediante `expo-localization`.
  - Contexto global `LanguageContext` con persistencia en AsyncStorage (`@flagspp_language_preference_v1`) y soporte para 3 modalidades: 📱 Sistema, 🇪🇸 Español y 🇬🇧 Inglés.
  - Selector táctil moderno en la pantalla de Perfil (Ajustes de la Aplicación) para alternar de forma inmediata entre idiomas sin reiniciar la app.
  - Diccionario completo de textos UI (`translations.ts`) y catálogo bilingüe para los 126 países (`countriesEn.ts`) cubriendo nombres de países, continentes, capitales y datos curiosos.
  - Traducción dinámica en tiempo real de toda la interfaz:
    - Barra de navegación inferior (TabBar) y cabeceras.
    - Pantalla de Perfil, estadísticas, insignias, logros (14 medallas) y modales de respaldo.
    - Atlas Mundial: buscador por país o capital, tarjetas de países, filtros de continente y ficha de estudio (`CountryStudyModal`).
    - Modos de Juego (Banderas, Capitales y Blitz): generación de preguntas, distractores de ciudades adaptados, badges de racha, escudos de velocidad, resúmenes de fin de partida y modal de recuento y repaso de fallos (`ReviewAnswersModal`).

- [x] **Modo Estudio / Quiz desde el Atlas (Micro-Desafío por País)**:
  - Botón interactivo *"🎯 Poner a prueba este país"* en la tarjeta de detalle de cada país en el Atlas.
  - Modal interactivo de estudio (`CountryStudyModal`) con flujo de 2 preguntas rápidas:
    1. Pregunta de Capital con 4 opciones (distractores de ciudades del mismo país o capitales del mismo continente).
    2. Pregunta de Bandera con cuadrícula 2x2 de banderas de países del mismo continente.
  - Animaciones fluidas, retroalimentación táctil y efectos de sonido en tiempo real (`soundService.triggerSuccess` y `soundService.triggerError`).
  - Pantalla de resultados con puntuación, estrellas, animación de confeti en caso de dominio perfecto, ganancia de XP registrada en el perfil y tarjeta de repaso del dato curioso.
  - Botón para reintentar la práctica inmediata o volver al Atlas sin perder la posición de scroll.
- [x] **Modo Oscuro Completo (Dark Mode con Sincronización de Sistema y Selector Manual)**:
  - Paleta semántica OLED de alto contraste (fondo `#000000`, tarjetas elevadas `#1C1C1E`, bordes sutiles y textos dinámicos).
  - Contexto centralizado `ThemeContext` con persistencia en AsyncStorage (`@flagspp_theme_preference_v1`).
  - Detección reactiva del tema nativo del sistema (`useColorScheme`) y control manual en Perfil (📱 Sistema / ☀️ Claro / 🌙 Oscuro).
  - Adaptación completa de todas las pantallas y modales: Play, Quiz de Banderas, Capitales, Desafío Blitz, Atlas, Perfil, TabBar translúcido con blur dinámico, Modales de inicio y Recuentos de repaso.
- [x] **Efectos de Sonido Reales (Audio SFX + Hápticos Sincronizados)**:
  - Integración nativa con `expo-audio` compatible con Expo SDK 57 / React 19.
  - Generación de 7 efectos de audio 16-bit 44.1kHz WAV: acierto celestial, error de tono bajo, tap táctil sutil, racha ascendente de combo, escudo salvavidas cristalino, fanfarria de celebración y tic-tac de cuenta regresiva.
  - Sincronización integral en `SoundService` con el sistema de respuesta háptica e integración en Quiz, Capitales, Blitz y Perfil, respetando las preferencias de usuario.
- [x] **Auditoría y Optimización Responsive Integral en Todos los Dispositivos**:
  - Reestructuración de la tarjeta "Modo Global" con botón de acción destacado `[Jugar ▶]` inmune a recortes por ancho de pantalla.
  - Insignias interactivas "Jugar" en las tarjetas de continentes y prevención de desbordamiento horizontal en pantallas estrechas.
  - Ajuste de márgenes inferiores en todos los ScrollViews y FlatLists (130px + insets.bottom) para despejar por completo la barra de navegación flotante y botones de Android.
  - Textos adaptables con auto-scaling (`adjustsFontSizeToFit`, `minWidth: 0`, `flexShrink: 1`) en cabeceras AppleHeader, preguntas, modales y opciones.
- [x] **Logros Adicionales (Achievements & Medallas)**:
  - 5 nuevas medallas desbloqueables integradas en el perfil: *"Conquistador de África 🌍"*, *"Experto en Oceanía 🏝️"*, *"Maestro Blitz 5s ⚡"*, *"Racha de 25 🔥"* y *"Maratón de 100 🏃‍♂️"*.
  - Sistema unificado de evaluación y progreso dinámico en `checkAchievements` para los 14 logros.
  - Sincronización y fusión automática con perfiles existentes en AsyncStorage.
- [x] **Contabilización Precisa de Partidas (`gamesPlayed`) y Progreso en Salida Anticipada**:
  - Registro de partida iniciada en cuanto el usuario responde su primera pregunta en cualquier modo.
  - Auto-recuperación (self-healing) de estadísticas históricas si `gamesPlayed` quedó subcontabilizado.
  - Guardado de estadísticas parciales y XP si el jugador sale a mitad de ronda con el botón atrás.
- [x] **Modo Repaso de Fallos (Review & Retry)**:
  - Botón interactivo `🔁 Repasar Fallos (X)` en la pantalla de fin de partida de Banderas, Capitales y Blitz, así como dentro de `ReviewAnswersModal`.
  - Generación de rondas de práctica exclusivas con los países que el usuario falló para consolidar el aprendizaje al instante.
  - Badge de estado `🎯 MODO REPASO` en cabecera durante la sesión.
- [x] **Mecánica Dinámica: Segunda Oportunidad Veloz (Speed Shield)**:
  - Contestar con precisión a máxima velocidad (&lt; 2.5s en Banderas/Capitales, &lt; 1.8s en Blitz) otorga un escudo de perdón `🛡️ Segunda Oportunidad`.
  - Si el jugador se equivoca con el escudo activo, se consume el escudo, la opción errónea queda tachada/descartada con badge y se le permite volver a intentar sin perder racha ni tiempo.
  - Interruptor en **Ajustes de la Aplicación** (Perfil) para desactivar la función y jugar con reglas clásicas retro.
- [x] **Selector de Cantidad de Preguntas (10, 20, 50 o Todo el Catálogo)**:
  - Selector disponible en la pantalla principal para el Quiz de Banderas y en la pantalla de dificultad de Capitales.
  - Adaptación automática del total de preguntas, progreso dinámico, cálculo de estrellas y bonificaciones de XP por maratón.
  - Selector rápido en la pantalla de fin de partida para iniciar la siguiente ronda con la cantidad deseada.
- [x] **Sistema de Baraja Inteligente sin Repeticiones (Zero Duplicates Engine)**:
  - Garantía de 0 preguntas repetidas dentro de una misma ronda en Banderas y Capitales.
  - Memoria entre rondas consecutivas para priorizar países aún no preguntados hasta completar el ciclo del continente o dificultad.
- [x] **Selector y Niveles de Dificultad en Modo Capitales**:
  - Pantalla inicial con 4 niveles de dificultad: *Fácil (Nivel 1 • 33 países)*, *Intermedio (Nivel 2 • 75 países)*, *Experto (Nivel 3 • 18 países)* y *Todas las Capitales (Modo Global • 126 países)*.
  - Filtrado dinámico de preguntas y distractores según la dificultad y el continente seleccionado.
  - Badge de dificultad en cabecera durante la partida y botón de *"Cambiar Dificultad"* en la pantalla de resumen.
- [x] **Ampliación del Catálogo de Países (Dataset Global: 69 ➔ 126 países)**
  - Expandido a 126 países cubriendo todos los continentes (Europa: 39, América: 29, Asia: 28, África: 20, Oceanía: 10).
  - Incluye códigos ISO para FlagCDN, capitales verificadas, banderas emoji, datos curiosos en español y niveles de dificultad (1, 2 y 3).
  - Conteos dinámicos en los niveles por continente de `PlayScreen` y `AtlasScreen`.
- [x] **Fase 2 de Perfil: Sistema de Copia de Seguridad y Respaldo / Restauración**
  - Botón nativo para compartir/exportar backup en JSON a Google Drive, WhatsApp, Notas o correo.
  - Modal estilizado para restaurar el progreso (XP, nivel, rachas, avatar, logros) en cualquier dispositivo.
- [x] **Selector de Continentes en Modo Capitales**
  - Barra de chips deslizable para practicar capitales de continentes específicos (*América, Europa, Asia, África, Oceanía, Todos*).
- [x] **Selector de Dificultad para Modo Blitz**
  - Modos *Rápido (15s)*, *Frenético (10s)* y *Extremo (5s - Hardcore)* con reloj dinámico y bonificaciones de tiempo.
- [x] **Eliminación del Octágono detrás de los Avatares**
  - Avatares limpios y transparentes con badge circular de selección y check azul.
- [x] **Pantalla de Recuento de Aciertos y Fallos (`ReviewAnswersModal`)**
  - Modal interactivo desde la pantalla de resultados para repasar todas las respuestas dadas con datos curiosos de cada país.
- [x] **Avance Automático con Temporizador**
  - Transición fluida tras responder con barra de cuenta regresiva y botón de saltar sin superposición de texto.
- [x] **Validación Obligatoria de Apodo en Perfil**
  - Verificación de campo no vacío con alertas nativas y estados de error visuales.
- [x] **Identidad Visual y Logotipo Oficial**
  - Globo terráqueo 3D con cintas de banderas integrado en `icon.png`, `splash.png`, favicon y headers.
- [x] **Distractores de Ciudades del Mismo País en Modo Capitales**:
  - En lugar de mostrar capitales de otros países, las 4 opciones de cada pregunta son ciudades reales del mismo país (ej. para Ecuador: Guayaquil, Cuenca, Machala vs Quito).
  - Diccionario completo de ciudades destacadas para los 126 países en `countryCities.ts` con fallback inteligente.

