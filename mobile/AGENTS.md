# ISSATK Attendance - Mobile App (Expo & React Native)

React Native + Expo mobile application for **ISSAT Kairouan Attendance Management**.

## How to Run the App

Run the Metro development server with Expo Go support:

```bash
npx expo start -g
# or
npm start
```

### On your Mobile Device:
1. Install **Expo Go** from Google Play Store (Android) or App Store (iOS).
2. Ensure your mobile phone and computer are connected to the same Wi-Fi network (or run `npx expo start --tunnel` if on different networks).
3. **Android**: Open the Expo Go app and tap "Scan QR code".
4. **iOS**: Open the default Camera app and scan the QR code displayed in the terminal.

## Project Structure

- `index.ts` - Expo registration entrypoint
- `App.tsx` - Complete React Native application containing all screens, state, styling, and navigation
- `app.json` - Expo configuration (name, slug, splash, orientation, icons)
- `package.json` - Dependencies (`expo`, `react-native`, `@expo/vector-icons`, `react-native-safe-area-context`)
- `assets/` - App icons, adaptive icons, and splash assets

## Features & Screens
- **Role Switcher**: Switch between **Student** (Amine Ben Amor) and **Teacher** (Mme. Sonia Mansouri)
- **Login Screen**: Credentials, role selector, language toggle (FR/EN), theme toggle (Light/Dark), password visibility
- **Home Screen**: Greeting, next class highlight card, timeline of daily courses with status badges, teacher admin strip
- **Timetable Screen**: Weekly day picker (Lun 17 to Sam 22), schedule timeline
- **Attendance Screen**:
  - Student: 3 summary stats cards (Présences, Absences, Justifiée), filter tabs, record history, "Justifier une absence" scanner trigger
  - Teacher: Student roster roll-call (P / A toggles), live count, offline validation check, confirmation submit
- **Class Details**: Course hero banner, schedule & classroom info, attendance status, student announcement card, teacher actions
- **Notifications**: List of announcements, schedule updates, and attendance confirmations
- **Document Scanner**: Camera viewport with corner guides, mock certificate, capture shutter button
- **Document Preview**: Realistic medical certificate sheet with signature & stamp, edit tools, send/draft buttons
- **Submission Confirmation**: Reference number, status badge, date, return to home
- **Announcements**: Teacher composer with group recipient preview and live character counter
- **Administrative Requests**: Form to submit leave or schedule changes, and request status history
- **Profile & Settings**: Identity card, Theme selector (Clair, Sombre, Système), language switcher, notification toggles, logout
- **Connectivity Simulator**: Header indicator toggles between Synced and Offline modes
