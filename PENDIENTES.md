# 📌 Lista de Pendientes y Roadmap — Flags++ 🌍✨

Documento de seguimiento de tareas, mejoras pendientes y nuevas funcionalidades para **Flags++**.

---

## 🚀 Siguiente Prioridad / En Progreso

- [ ] **Modo Repaso de Fallos (Review & Retry)**:
  - En la pantalla de resultados de cualquier juego (Banderas, Capitales, Blitz), botón para iniciar una ronda de práctica inmediata compuesta únicamente por las preguntas que el jugador falló.
- [ ] **Modo Estudio / Quiz desde el Atlas**:
  - En la ficha detallada de cada país en el Atlas, botón de *"Poner a prueba este país"* para abrir una micro-pregunta sobre su bandera y capital.

---

## ⏳ Tareas Pendientes Futuras (Backlog)

### 🎮 Experiencia de Juego (Gameplay)
- [ ] **Logros Adicionales (Achievements)**:
  - Nuevas medallas desbloqueables (ej. *"Conquistador de África"*, *"Experto en Oceanía"*, *"Maestro del Blitz 5s"*, *"Racha de 25"*).
- [ ] **Filtro por Dificultad en el Atlas**:
  - Filtrar países por dificultad (Fácil, Intermedio, Experto).

### 🎨 Audio y Experiencia de Usuario (UI/UX)
- [ ] **Efectos de Sonido Reales**:
  - Implementar efectos de audio sintetizados o empaquetados para aciertos, errores, combos y final de partida junto al sistema de vibraciones hápticas.
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
