# Shabari Mobile App - TODO

## Step 1 Features (Current Phase)

### Branding & Configuration
- [x] Generate custom app logo (shield with security theme)
- [x] Update app.config.ts with app name and logo URL
- [x] Update theme colors to match security brand (blue primary, green/yellow/red risk indicators)

### Home Screen (Dashboard)
- [x] Create home screen layout with status indicator
- [x] Add large circular "Scan QR" button with shield icon
- [x] Implement recent scan history list (last 5 scans)
- [x] Add statistics card (scans today, threats blocked)
- [x] Add tab bar navigation with icons

### QR Scanner Screen
- [x] Install and configure expo-camera or react-native-vision-camera
- [x] Create full-screen camera viewfinder with overlay
- [x] Add animated scanning frame with corner brackets
- [x] Implement QR code detection logic
- [x] Add gallery picker for scanning saved QR images
- [x] Add "Verifying..." shimmer effect during API call
- [x] Implement haptic feedback on successful scan

### Risk Assessment Screen (3-Tier Friction UI)
- [x] Create base risk assessment screen layout
- [x] Implement Green tier (Trust Score 80-100) - Verified Merchant UI
- [x] Implement Yellow tier (Trust Score 40-79) - Caution UI with name comparison
- [x] Implement Red tier (Trust Score 0-39) - Danger UI with 5-second countdown
- [x] Add risk score gauge component (0-100)
- [x] Add merchant information cards
- [x] Implement countdown timer for Red tier
- [ ] Add UPI intent launching (open GPay/PhonePe)
- [x] Add cancel and report buttons

### Backend API Integration
- [x] Create tRPC endpoints for fraud detection
- [x] Implement UPI string parser (upi://pay)
- [x] Add VPA verification API integration (Cashfree/Razorpay)
- [x] Implement NPCI compliance check (₹2,000 limit for P2P collect)
- [ ] Add Google Safe Browsing API integration
- [ ] Add VirusTotal API integration
- [ ] Implement URL unshortener service
- [x] Create weighted risk scorer (Reputation 40%, Heuristics 30%, Identity 30%)
- [ ] Set up PostgreSQL database schema for fraud data
- [ ] Implement Redis cache for hot-list scammers
- [x] Add SHA-256 hashing for VPAs (DPDP compliance)

### History Screen
- [x] Create history screen with search bar
- [ ] Add filter chips (All / Safe / Caution / Danger)
- [ ] Implement scrollable scan history list
- [ ] Add swipe-to-delete functionality
- [ ] Implement pull-to-refresh
- [ ] Store scan history in AsyncStorage

### Scan Detail Screen
- [ ] Create scan detail screen layout
- [ ] Add risk score gauge visualization
- [ ] Display merchant information card
- [ ] Show risk breakdown (Reputation, Heuristics, Identity percentages)
- [ ] Add UPI string details section
- [ ] Add "Scan Again" and "Report as Fraud" buttons

### Notification Listener (Silent Guard)
- [ ] Create notification listener settings screen
- [ ] Add toggle switch for Silent Guard
- [ ] Implement Android NotificationListenerService
- [ ] Add permission request flow
- [ ] Parse notifications for keywords ("Collect Request", "Requested Money")
- [ ] Create high-priority alert notification
- [ ] Add supported apps list (PhonePe, GPay, Paytm)

### Settings Screen
- [x] Create settings screen with grouped list
- [x] Add Silent Guard configuration link
- [x] Add Data & Privacy section with DPDP compliance info
- [x] Add About & Help section

### UI Components & Styling
- [x] Create reusable button components (Primary, Secondary, Destructive)
- [x] Create card components with elevation and borders
- [ ] Create badge components (Green/Yellow/Red pills)
- [x] Add SF Symbols icon mappings to icon-symbol.tsx
- [x] Implement press feedback animations (scale + haptic)
- [x] Add shimmer loading component
- [x] Create risk indicator color system

### Data Storage & Privacy
- [ ] Implement AsyncStorage for scan history (max 1000 entries)
- [ ] Add local caching for risk scores
- [ ] Ensure no plain-text VPAs stored (SHA-256 only)
- [ ] Implement data retention policy (auto-delete old scans)

### Testing & Polish
- [ ] Test QR scanning on real devices
- [ ] Test all three risk tiers with mock data
- [ ] Verify haptic feedback on iOS and Android
- [ ] Test notification listener on Android
- [ ] Verify DPDP compliance (no plain-text data storage)
- [ ] Test offline mode (cached results)
- [ ] Performance testing (< 2s risk assessment)

## Step 2 Features (Future)
- [ ] Implement SIM binding (ICCID capture)
- [ ] Add 24-hour cooling period logic
- [ ] Create security dashboard for cooling period
- [ ] Implement liveness detection for identity re-verification
- [ ] Add Sanchar Saathi / TAF-COP integration
- [ ] Create "Not My Number" report wizard

## Step 3 Features (Future)
- [ ] Implement hardware-level SIM monitoring
- [ ] Add persistent heartbeat service (WorkManager)
- [ ] Implement SIM swap detection
- [ ] Add TIUE compliance (6-hour periodic logout)
- [ ] Create identity health audit screen


## Next Phase Features (In Progress)

### Scan History & Data Storage
- [x] Create ScanRecord type definition in shared/types.ts
- [x] Implement AsyncStorage helper functions for scan history
- [x] Add scan history limit (max 1000 entries)
- [x] Implement auto-delete for old scans (retention policy)
- [x] Save scan results to AsyncStorage after risk assessment
- [x] Load scan history on app startup

### Enhanced History Screen
- [x] Implement filter chips (All / Safe / Caution / Danger)
- [x] Add search functionality for merchant names and VPAs
- [x] Display scrollable list of scan cards with FlatList
- [x] Add swipe-to-delete functionality for individual scans
- [x] Implement pull-to-refresh to reload history
- [x] Add empty state when no scans match filters
- [x] Show scan count by risk tier

### UPI Intent Launching
- [x] Implement Linking API to open UPI apps
- [x] Add deep link support for GPay, PhonePe, Paytm
- [x] Handle app not installed scenario
- [x] Add fallback to browser-based UPI payment

### Home Screen Enhancements
- [x] Display real scan statistics from AsyncStorage
- [x] Show recent scans (last 5) with risk indicators
- [x] Add tap handler to navigate to scan detail
- [x] Update threat counter based on blocked scans


## Step 1 Remaining Features (Critical)

### Link & Malware Scanner
- [x] Integrate Google Safe Browsing API v4
- [x] Add URL extraction from UPI transaction notes
- [x] Implement phishing link detection
- [x] Integrate VirusTotal API v3
- [x] Add .apk and .zip download link scanning
- [x] Implement file hash checking
- [x] Create URL unshortener service (bit.ly, tinyurl, etc.)
- [x] Add expanded URL to risk assessment

### Database & Caching
- [x] Create MySQL schema for fraud_vpas table
- [x] Create MySQL schema for url_blacklist table
- [x] Create MySQL schema for scan_logs table
- [x] Implement database migration scripts
- [x] Set up Redis connection
- [x] Implement Bloom filter for VPA blacklist
- [x] Add Redis cache for hot-list scammers (<50ms lookup)
- [x] Implement cache invalidation logic

### API Integration
- [x] Request Google Safe Browsing API key (environment variable ready)
- [x] Request VirusTotal API key (environment variable ready)
- [x] Add API key management in environment variables
- [x] Implement rate limiting for external APIs
- [x] Add error handling for API failures
- [x] Implement fallback logic when APIs are unavailable


## Step 2: Security UX & Shield Interface (In Progress)

### App Manifest & Permissions
- [x] Add BIND_NOTIFICATION_LISTENER_SERVICE permission to app.config.ts
- [x] Configure Intent Filters for upi:// scheme handling
- [x] Configure Intent Filters for https:// scheme handling
- [x] Set up App Links for deep linking from WhatsApp/SMS
- [x] Request notification listener permission from user

### Notification Listener Service (Silent Guard)
- [x] Create Silent Guard logic module (ready for native integration)
- [x] Implement notification monitoring for PhonePe app
- [x] Implement notification monitoring for GPay app
- [x] Implement notification monitoring for Paytm app
- [x] Add "Collect Request" pattern detection logic
- [x] Add "Requested Money" pattern detection logic
- [x] Extract VPA from notification content
- [x] Check extracted VPA against blacklist
- [x] Fire high-priority Shabari alert notification
- [x] Add custom alert sound and vibration pattern
- [x] Create Silent Guard settings screen
- [x] Create alert history screen
- [ ] Add native Android NotificationListenerService module (requires ejecting from Expo)

### Intent Interception
- [x] Register app as handler for upi:// URIs
- [x] Intercept UPI payment links from external apps
- [x] Show Shabari verification screen before opening payment app
- [x] Handle deep links from WhatsApp
- [x] Handle deep links from SMS
- [x] Handle deep links from Email
- [x] Add link interception indicator on risk assessment screen

### Dynamic Guidance UX
- [x] Add SYSTEM_ALERT_WINDOW permission to manifest
- [x] Create custom notification channel for security alerts
- [x] Implement high-priority alert system
- [x] Add alert history tracking
- [ ] Implement System Alert Window overlay (requires native module)
- [ ] Add floating "Shabari-Verified" badge widget (requires native module)
- [ ] Implement gallery QR scanner from floating widget

### Settings & Permissions Management
- [x] Add Silent Guard toggle in Settings
- [x] Create permission request flow for Notification Listener
- [x] Add tutorial explaining why permissions are needed
- [x] Create fallback UI when permissions denied
- [x] Add "Open System Settings" button for manual permission grant


## Bug Fixes (Critical)

### Expo Go Notification Error
- [x] Remove expo-notifications import from silent-guard.ts causing Expo Go crash
- [x] Use conditional imports for notification features
- [ ] Test app in Expo Go after fix

### Camera Scanner Black Screen
- [x] Fix CameraView not rendering in scanner.tsx
- [x] Add proper camera initialization and error handling
- [x] Ensure camera permissions are properly requested
- [ ] Test camera in both Expo Go and APK build


## QR Code Testing

### End-to-End Flow Testing
- [x] Generate test UPI QR codes for Green tier (verified merchant)
- [x] Generate test UPI QR codes for Yellow tier (name mismatch)
- [x] Generate test UPI QR codes for Red tier (blacklisted VPA)
- [x] Test backend API with sample UPI strings
- [x] Create comprehensive testing documentation
- [x] Write and run 13 unit tests for fraud detection logic
- [ ] Verify risk assessment screen displays correctly for each tier (requires physical device)
- [ ] Test UPI intent launching to payment apps (requires physical device)
- [ ] Verify scan history saves correctly (requires physical device)


## Critical Bug Fixes (Reported by User)

### Camera Black Screen Issue (Persistent)
- [x] Investigate why CameraView shows black screen on physical device
- [x] Try using expo-barcode-scanner instead of expo-camera
- [x] Add camera initialization delay/retry logic
- [ ] Test on multiple Android devices

### Stuck on "Verifying Payment" Issue
- [x] App cannot reach backend server from user's device (expected)
- [x] Implement offline fraud detection logic in the app
- [x] Move UPI parsing to client-side
- [x] Move risk scoring to client-side
- [x] Add local blacklist storage with AsyncStorage
- [x] Add timeout and error handling for API calls
- [x] Show error message when API fails instead of infinite spinner


## Link Interception Feature (User Requested)

### Link Verification Screen
- [x] Create link-check.tsx screen to verify URLs before opening
- [x] Display URL being checked with loading state
- [x] Show safety status (Safe/Suspicious/Dangerous)
- [x] Check URL against local phishing patterns (offline)
- [x] Check for URL shorteners and expand them
- [x] Display domain reputation information
- [x] Add "Open Safely" and "Block" buttons
- [x] Save checked links to history

### App Configuration for Link Handling
- [x] Configure app as default browser/link handler option
- [x] Add intent filters for http:// and https:// schemes
- [x] Handle incoming URLs from WhatsApp, SMS, Email
- [x] Show app chooser dialog when links are clicked
- [x] Add instructions for users to set Shabari as default

### Deep Linking Setup
- [x] Configure Expo deep linking for URL schemes
- [x] Handle incoming links in app root layout
- [x] Route intercepted links to verification screen
- [x] Implement proper URL parsing and validation

### User Experience
- [x] Add settings toggle for link interception
- [x] Show tutorial on how to enable link checking
- [x] Add quick action to open link after verification
- [x] Implement "Always trust this domain" feature


## Always Trust This Domain Feature (User Requested)

### Domain Whitelist Storage
- [x] Create AsyncStorage functions for storing trusted domains
- [x] Implement addTrustedDomain function
- [x] Implement removeTrustedDomain function
- [x] Implement getTrustedDomains function
- [x] Implement isTrustedByUser function

### Link Checker Integration
- [x] Update checkLink to check user whitelist first
- [x] Skip full verification for whitelisted domains
- [x] Return instant "safe" result for trusted domains
- [x] Add "trustedByUser" flag to LinkCheckResult

### Link Check Screen UI
- [x] Add "Always Trust This Domain" button on safe results
- [x] Show confirmation dialog before adding to whitelist
- [x] Display badge for user-trusted domains

### Settings UI
- [x] Add "Trusted Domains" section in link-checker-settings
- [x] Display list of user-whitelisted domains
- [x] Add swipe-to-delete for removing trusted domains
- [x] Add "Clear All Trusted Domains" option

### Testing
- [x] Write unit tests for whitelist functions (14 tests passing)
- [x] Test whitelist integration with link checker


## Hybrid Mode Implementation (User Requested)

### Architecture
- [x] Create hybrid fraud detection module
- [x] Try backend API first for real-time threat intelligence
- [x] Fallback to offline detection when backend unavailable
- [x] Add connection timeout (3 seconds)
- [x] Cache backend availability status
- [x] Show indicator in UI (Online/Offline mode)

### Backend Configuration
- [x] Add BACKEND_API_URL environment variable (EXPO_PUBLIC_API_URL)
- [x] Create backend connection test function
- [x] Add settings screen for backend URL configuration
- [x] Show backend connection status in settings
- [x] Allow users to manually trigger backend sync

### UPI/QR Fraud Detection (Hybrid)
- [x] Try backend scanQr API first
- [x] Use Google Safe Browsing for link checking (via backend)
- [x] Use VirusTotal for malware scanning (via backend)
- [x] Access live blacklist database (via backend)
- [x] Fallback to offline detection on timeout/error
- [x] Show "Verified Online" badge when backend used

### URL Link Checking (Hybrid)
- [ ] Try backend checkLink API first
- [ ] Get real-time phishing detection
- [ ] Get malware scan results
- [ ] Access community blacklist
- [ ] Fallback to offline patterns on timeout/error
- [ ] Show "Online Protection" indicator

### Testing
- [ ] Test with backend available (local dev server)
- [ ] Test with backend unavailable (airplane mode)
- [ ] Test fallback behavior on timeout
- [ ] Verify offline mode still works independently


## Onboarding Tutorial (User Requested)

### Onboarding Screens
- [x] Create onboarding screen 1: QR scanning explanation with visual example
- [x] Create onboarding screen 2: Link checking setup (set as default browser)
- [x] Create onboarding screen 3: Risk tier system (Green/Yellow/Red) explanation
- [x] Add pagination dots indicator
- [x] Add "Next" and "Skip" buttons
- [x] Add "Get Started" button on final screen

### First Launch Detection
- [x] Create AsyncStorage helper for onboarding state
- [x] Check if user has completed onboarding on app launch
- [x] Show onboarding on first launch only
- [x] Add "Show Tutorial Again" option in settings

### Visual Design
- [x] Add illustrations/icons for each onboarding screen
- [x] Use brand colors (blue primary, green/yellow/red for tiers)
- [x] Ensure professional UI matching Apple HIG standards
- [x] Add smooth transitions between screens
