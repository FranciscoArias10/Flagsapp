# Flags++ 🌍✨

> An iOS-inspired, interactive flag and geography trivia mobile application built with **React Native** and **Expo**.

Flags++ combines world geography learning with gamified trivia mechanics, haptic feedback, fluid animations, and an Apple-style design aesthetic.

---

## 📱 Features

### 🎮 Multiple Game Modes
- **Classic Flag Quiz**: Guess the country from its flag across different continents and difficulty levels (Novice, Intermediate, Master).
- **Capitals Challenge**: Put your geography knowledge to the test by matching world capitals to their respective countries.
- **Blitz Mode**: A high-tempo, against-the-clock speed run to build combos, extend streaks, and maximize your XP score.

### 📖 Interactive World Atlas
- Search and filter countries by continent (Americas, Europe, Asia, Africa, Oceania).
- High-definition flag rendering via FlagCDN.
- Rich demographic data including population stats, capital cities, and interesting cultural trivia.

### 🏆 Gamification & Progression
- **Leveling & XP System**: Earn experience points with every correct answer and level up your explorer title.
- **Streak Multipliers**: Maintain answer streaks to earn bonus points and unlock special badges.
- **Game Center-style Achievements**: Unlockable trophies and milestone badges with animated toast notifications.
- **Offline Persistence**: All stats, unlocked achievements, and continent mastery progress are saved locally with AsyncStorage.

### 🎨 Apple-Inspired Design & Haptics
- **iOS Design Language**: Translucent tab bars, clean typography, soft shadows, and card-based navigation.
- **Micro-Interactions**: Smooth spring physics powered by React Native Animated and Reanimated.
- **Taptic Feedback**: Integrated haptic responses (`expo-haptics`) for button taps, correct answers, streaks, and achievement unlocks.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React Native (0.86)** | Cross-platform native mobile foundation |
| **Expo (SDK 57)** | Development tooling and native runtime |
| **TypeScript** | Type-safe application logic |
| **React Native Reanimated** | High-performance fluid animations |
| **Expo Haptics** | Tactile vibration feedback |
| **Expo Blur & Linear Gradient** | iOS-style frosted glass and gradient cards |
| **AsyncStorage** | Local persistent storage for player statistics |
| **FlagCDN** | High-definition flag imagery |

---

## 📂 Project Structure

```text
Flagspp/
├── src/
│   ├── components/       # Reusable UI components (AppleCard, AppleButton, AppleTabBar, etc.)
│   ├── context/          # Global GameContext and state management
│   ├── data/             # Country information, capitals, facts, and achievements catalog
│   ├── screens/          # Core screens (PlayScreen, CapitalsGameScreen, AtlasScreen, ProfileScreen)
│   ├── types/            # TypeScript data models and interfaces
│   └── utils/            # Quiz generators, haptics, and color palette tokens
├── App.tsx               # Application entry point and navigation coordinator
├── app.json              # Expo configuration
├── package.json          # Project dependencies and npm scripts
└── run-emulator.sh       # Script for running lightweight Android AVD on Linux
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or newer recommended)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
- **Expo Go** app installed on your physical mobile device ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) or [iOS](https://apps.apple.com/app/expo-go/id982107779)), or an Android/iOS emulator.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/FranciscoArias10/Flagsapp.git
   cd Flagsapp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Running the App

1. **Start the Expo development server:**
   ```bash
   npx expo start
   ```

2. **Open the app:**
   - **Physical Device (Recommended):** Scan the QR code displayed in the terminal using the **Expo Go** app on your phone.
   - **Android Emulator:** Press `a` in the terminal, or run `./run-emulator.sh`.
   - **Web Browser:** Press `w` in the terminal to view in a browser.

---

## 📜 Available Scripts

- `npm run start` - Starts the interactive Expo development server.
- `npm run android` - Starts the development server and opens an Android emulator.
- `npm run web` - Starts the web preview version.
- `npm run emu` - Runs the custom lightweight Android emulator launcher.

---

## 👤 Author

Developed by **Francisco Arias** ([@FranciscoArias10](https://github.com/FranciscoArias10)).
