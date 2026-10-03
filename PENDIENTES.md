# 📌 Lista de Pendientes y Roadmap — Flags++ 🌍✨

Documento de seguimiento de tareas, mejoras pendientes y nuevas funcionalidades para **Flags++**.

---

## 🚀 Siguiente Prioridad / En Progreso

- [ ] **Modo Estudio / Quiz desde el Atlas**:
  - En la ficha detallada de cada país en el Atlas, botón de *"Poner a prueba este país"* para abrir una micro-pregunta sobre su bandera y capital.

---

## ⏳ Tareas Pendientes Futuras (Backlog)

### 🎮 Experiencia de Juego (Gameplay)
- [ ] **Filtro por Dificultad en el Atlas**:
  - Filtrar países por dificultad (Fácil, Intermedio, Experto).

### 🎨 Audio y Experiencia de Usuario (UI/UX)
- [ ] **Modo Oscuro Completo (Dark Mode)**:
  - Sincronización del tema oscuro del sistema para jugar en entornos nocturnos.

### 🌐 Internacionalización y Soporte Multi-idioma (i18n)
- [ ] **Soporte de Idioma Inglés y Detección Automática**:
  - Detectar el idioma del dispositivo mediante `expo-localization`.
  - Diccionario de textos de interfaz (UI: botones, pestañas, modales, alertas y estadísticas).
  - Traducción de nombres de países, continentes y capitales en el motor de preguntas y Atlas.
  - Opción manual en la pantalla de Perfil para alternar entre Español e Inglés.

---

## ✅ Tareas Completadas

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

