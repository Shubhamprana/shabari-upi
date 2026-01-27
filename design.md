# Shabari Mobile App - Design Document

## App Overview

**Shabari** is a mobile security application designed specifically for the Indian market to protect users from UPI fraud, phishing scams, and malicious payment requests. The app provides real-time fraud detection, risk assessment, and intervention mechanisms to prevent financial losses.

## Design Philosophy

The app follows **Apple Human Interface Guidelines (HIG)** and mainstream iOS mobile app design standards to ensure a professional, trustworthy, and intuitive user experience. The design emphasizes:

- **Security-first visual language**: Clear risk indicators using color-coded system (Green/Yellow/Red)
- **One-handed usability**: All primary actions accessible within thumb reach
- **Minimal friction for safe transactions**: Green-rated merchants get instant approval
- **Progressive friction for risky transactions**: Yellow and Red ratings introduce deliberate delays and warnings
- **Privacy-focused**: Local data storage, minimal data collection, DPDP Act 2023 compliance

## Color Palette

### Brand Colors
- **Primary**: `#0066FF` (Trust Blue) - Used for primary actions, verified badges
- **Background**: Light `#FFFFFF`, Dark `#000000`
- **Surface**: Light `#F5F5F5`, Dark `#1C1C1E`
- **Foreground Text**: Light `#000000`, Dark `#FFFFFF`

### Risk Indicator Colors
- **Green (Safe)**: `#34C759` - Trust Score 80-100, verified merchants
- **Yellow (Caution)**: `#FF9500` - Trust Score 40-79, name mismatches
- **Red (Danger)**: `#FF3B30` - Trust Score 0-39, known scams
- **Muted**: `#8E8E93` - Secondary text, disabled states

## Screen List & Layout

### 1. Home Screen (Dashboard)
**Purpose**: Main entry point showing app status and quick actions

**Primary Content**:
- App status indicator (Active Protection / Cooling Period)
- Quick scan button (large, prominent)
- Recent scan history (last 5 scans with risk indicators)
- Statistics card (scans today, threats blocked)

**Layout** (Portrait 9:16):
- Top: Status bar with protection status badge
- Hero section: Large circular "Scan QR" button with shield icon
- Middle: Recent activity list with swipeable cards
- Bottom: Tab bar navigation

**Key User Flows**:
- Tap "Scan QR" → Opens QR Scanner Screen
- Tap recent scan → Opens Scan Detail Screen
- Tap statistics → Opens History Screen

---

### 2. QR Scanner Screen
**Purpose**: High-speed QR code scanning for UPI payment verification

**Primary Content**:
- Full-screen camera viewfinder with overlay
- Scanning frame with animated corners
- Instructions text: "Point camera at QR code"
- Gallery button (bottom-left) to scan from saved images
- Cancel button (top-left)

**Layout** (Portrait 9:16):
- Full-screen camera preview
- Semi-transparent overlay with centered scanning frame
- Bottom sheet with instructions and gallery access

**Key User Flows**:
- Camera detects QR → Show "Verifying..." shimmer → Navigate to Risk Assessment Screen
- Tap gallery icon → Open photo picker → Scan selected QR → Navigate to Risk Assessment Screen
- Tap cancel → Return to Home Screen

---

### 3. Risk Assessment Screen (3-Tier Friction UI)
**Purpose**: Display trust score and guide user decision based on risk level

**Primary Content** (varies by risk level):

#### Green (Trust Score 80-100) - Verified Merchant
- Large green checkmark icon
- "Verified Merchant" badge
- Bank registered name in bold
- Merchant details (VPA, amount)
- Large green "Pay via GPay/PhonePe" button
- Small "View Details" link

#### Yellow (Trust Score 40-79) - Caution
- Yellow warning icon
- "Caution Required" banner
- Name mismatch alert: "Merchant name does not match bank account name"
- Side-by-side comparison:
  - QR Code Name: [Name from QR]
  - Bank Account Name: [Official name from VPA verification]
- Medium-sized yellow "Proceed with Caution" button
- "Cancel Transaction" button (secondary)

#### Red (Trust Score 0-39) - Danger
- Full-screen red overlay
- Large red stop icon
- Bold warning text: "STOP: This account is linked to Job Fraud / Electricity Bill Scams"
- Detailed risk breakdown:
  - Reputation: Known scammer VPA
  - Heuristics: "Collect Request" pattern detected
  - Identity: Name mismatch
- 5-second countdown timer (button disabled during countdown)
- Small "I Understand the Risk" button (enabled after 5 seconds)
- Prominent "Cancel & Report" button

**Layout** (Portrait 9:16):
- Top: Risk indicator (color-coded header)
- Middle: Risk details and merchant information
- Bottom: Action buttons (size and prominence vary by risk level)

**Key User Flows**:
- Green: Tap "Pay" → Open UPI app with payment intent
- Yellow: Tap "Proceed with Caution" → Confirmation dialog → Open UPI app
- Red: Wait 5 seconds → Tap "I Understand" → Final warning dialog → Open UPI app
- Any level: Tap "Cancel" → Return to Home Screen, save scan to history

---

### 4. Notification Listener Screen (Settings)
**Purpose**: Configure notification monitoring for proactive protection

**Primary Content**:
- Toggle switch: "Enable Silent Guard"
- Explanation text: "Monitor payment app notifications for suspicious 'Collect Request' messages"
- Supported apps list: PhonePe, GPay, Paytm (with icons)
- Permission status indicator
- "Grant Permission" button (if not granted)

**Layout** (Portrait 9:16):
- Header: "Silent Guard Protection"
- Toggle card with icon and description
- Supported apps grid
- Permission request button

**Key User Flows**:
- Toggle ON → Check permission → If not granted, show system permission dialog
- Permission granted → Start notification listener service → Show "Active" status
- Toggle OFF → Stop notification listener service

---

### 5. History Screen
**Purpose**: View all past scans with filtering and search

**Primary Content**:
- Search bar
- Filter chips: All / Safe / Caution / Danger
- Scrollable list of scan cards:
  - Merchant name
  - VPA
  - Risk score badge (color-coded)
  - Timestamp
  - Amount (if available)

**Layout** (Portrait 9:16):
- Top: Search bar and filter chips
- Middle: Scrollable list of scan cards
- Bottom: Tab bar navigation

**Key User Flows**:
- Tap scan card → Open Scan Detail Screen
- Swipe left on card → Delete option
- Pull to refresh → Reload history

---

### 6. Scan Detail Screen
**Purpose**: Show comprehensive details of a specific scan

**Primary Content**:
- Risk score gauge (0-100 with color indicator)
- Merchant information card
- Risk breakdown:
  - Reputation score (40%)
  - Heuristics score (30%)
  - Identity score (30%)
- UPI string details
- Scan timestamp
- Action buttons: "Scan Again" / "Report as Fraud"

**Layout** (Portrait 9:16):
- Top: Large risk score gauge
- Middle: Scrollable details cards
- Bottom: Action buttons

**Key User Flows**:
- Tap "Scan Again" → Open QR Scanner Screen
- Tap "Report as Fraud" → Open reporting form
- Tap back → Return to History Screen

---

### 7. Settings Screen
**Purpose**: App configuration and account management

**Primary Content**:
- Profile section (if user auth enabled)
- Notification settings
- Silent Guard configuration
- SIM binding status
- Data & Privacy section
- About & Help section

**Layout** (Portrait 9:16):
- Grouped list of settings cards
- Each card has icon, title, subtitle, and chevron

**Key User Flows**:
- Tap "Silent Guard" → Open Notification Listener Screen
- Tap "SIM Binding" → Show SIM status and trusted SIM info
- Tap "Data & Privacy" → Show DPDP compliance info and data handling policy

---

## Navigation Structure

### Tab Bar (Bottom Navigation)
1. **Home** (house.fill icon) - Dashboard
2. **History** (clock.fill icon) - Scan history
3. **Scan** (qrcode.fill icon) - Quick scan (center, elevated)
4. **Settings** (gear.fill icon) - App settings

### Modal Screens (Full-screen overlays)
- QR Scanner Screen (from Home or Tab Bar)
- Risk Assessment Screen (from QR Scanner)
- Notification Alert (system overlay, triggered by Silent Guard)

---

## Key Interactions & Animations

### QR Scanner
- **Camera viewfinder**: Smooth 60fps preview
- **Scanning frame**: Animated corner brackets that pulse when searching
- **Success feedback**: Green flash + haptic feedback when QR detected
- **Shimmer effect**: Animated gradient overlay during "Verifying..." state

### Risk Assessment
- **Entry animation**: Slide up from bottom with spring animation (300ms)
- **Risk indicator**: Fade in with scale animation (200ms)
- **Countdown timer**: Circular progress indicator for 5-second lockdown
- **Button states**: Scale down to 0.97 on press with haptic feedback

### Notification Alert
- **System overlay**: Full-screen modal with blur background
- **Alert icon**: Animated warning icon with pulse effect
- **Auto-dismiss**: Swipe down to dismiss or auto-dismiss after 10 seconds

---

## Typography

### Font Family
- **iOS**: SF Pro (system default)
- **Android**: Roboto (system default)

### Type Scale
- **Hero**: 34pt, Bold - Main headings
- **Title**: 28pt, Semibold - Screen titles
- **Headline**: 22pt, Semibold - Section headers
- **Body**: 17pt, Regular - Primary content
- **Callout**: 16pt, Regular - Secondary content
- **Caption**: 13pt, Regular - Metadata, timestamps
- **Button**: 17pt, Semibold - Action buttons

---

## Iconography

### Icon Style
- **SF Symbols** (iOS) with Material Icons fallback (Android)
- **Stroke weight**: Medium (default)
- **Size**: 24pt for tab bar, 20pt for inline icons

### Key Icons
- **Shield**: App logo, protection status
- **QR Code**: Scanner, scan history
- **Checkmark Circle**: Verified, safe
- **Exclamation Triangle**: Caution, warning
- **Stop Circle**: Danger, blocked
- **Bell**: Notifications, Silent Guard
- **Clock**: History, recent activity
- **Gear**: Settings, configuration

---

## Component Library

### Buttons
- **Primary**: Filled background, white text, rounded corners (12pt radius)
- **Secondary**: Outlined border, colored text, rounded corners
- **Destructive**: Red background, white text, rounded corners
- **Text**: No background, colored text, no border

### Cards
- **Surface**: Elevated card with subtle shadow
- **Border**: 1pt border with rounded corners (16pt radius)
- **Padding**: 16pt internal padding
- **Spacing**: 12pt between cards

### Input Fields
- **Border**: 1pt border with rounded corners (8pt radius)
- **Padding**: 12pt internal padding
- **Focus state**: Blue border, subtle shadow

### Badges
- **Pill shape**: Rounded corners (full radius)
- **Padding**: 6pt horizontal, 4pt vertical
- **Text**: 13pt, Semibold
- **Colors**: Green/Yellow/Red based on risk level

---

## Accessibility

- **VoiceOver/TalkBack**: All interactive elements have descriptive labels
- **Dynamic Type**: Text scales with system font size settings
- **Color Contrast**: WCAG AA compliance (4.5:1 for text)
- **Touch Targets**: Minimum 44pt × 44pt for all interactive elements
- **Haptic Feedback**: Tactile feedback for important actions

---

## Performance Targets

- **QR Scan Speed**: < 500ms from detection to verification request
- **Risk Assessment**: < 2 seconds from scan to result display
- **App Launch**: < 1 second to home screen
- **Frame Rate**: 60fps for all animations and scrolling
- **Memory**: < 100MB RAM usage during normal operation

---

## Privacy & Security

- **Local Storage**: All scan history stored in AsyncStorage (device-only)
- **No Cloud Sync**: User data never leaves device (except API requests for verification)
- **Minimal Data Collection**: Only VPA hashes sent to backend for risk scoring
- **DPDP Compliance**: SHA-256 hashing of sensitive data, no plain-text VPAs stored
- **Secure Communication**: TLS 1.3 for all API requests

---

## Technical Implementation Notes

### QR Scanner
- Use `expo-camera` or `react-native-vision-camera` for high-performance scanning
- Implement debouncing to prevent duplicate scans
- Support both camera and gallery image scanning

### Risk Assessment
- Fetch risk score from backend API (FastAPI)
- Cache results locally for offline access
- Implement retry logic for network failures

### Notification Listener
- Use native modules for Android `NotificationListenerService`
- iOS: Use notification content extensions (limited capabilities)
- Parse notification content for keywords: "Collect Request", "Requested Money"

### Data Storage
- AsyncStorage for scan history (max 1000 entries)
- MMKV for high-performance key-value storage (if needed)
- SQLite for complex queries (if history grows large)

---

## Future Enhancements (Step 2 & 3)

- **Step 2**: SIM binding, cooling period logic, Sanchar Saathi integration
- **Step 3**: Liveness detection, hardware lock, TIUE compliance
- **Additional Features**: Link scanner, malware detection, system-wide protection via VPN service
