# Shabari QR Code Testing Guide

## Overview

This guide provides instructions for testing the end-to-end QR code scanning flow in the Shabari mobile app. Test QR codes have been generated for different risk scenarios to verify the fraud detection pipeline.

---

## Generated Test QR Codes

Four test QR codes have been generated in the `test-qr-codes/` directory:

### 1. Green Tier - Verified Merchant ✅
**File**: `green-tier-qr.png`  
**UPI String**: `upi://pay?pa=merchant@paytm&pn=Amazon&am=500&cu=INR&tn=Order%20Payment`  
**Expected Behavior**:
- **Risk Tier**: Green (Trust Score 80-100)
- **UI**: Green checkmark icon, "Verified Merchant" badge
- **Button**: "Pay via GPay/PhonePe" (green background)
- **Description**: Legitimate merchant with matching name

### 2. Yellow Tier - Name Mismatch ⚠️
**File**: `yellow-tier-qr.png`  
**UPI String**: `upi://pay?pa=john123@ybl&pn=Flipkart&am=1000&cu=INR&tn=Product%20Payment`  
**Expected Behavior**:
- **Risk Tier**: Yellow (Trust Score 40-79)
- **UI**: Yellow warning triangle, "Caution Required" header
- **Warning**: "Name Mismatch Detected" banner
- **Button**: "Proceed with Caution" (yellow background)
- **Description**: VPA name doesn't match merchant name

### 3. Red Tier - Blacklisted VPA 🚨
**File**: `red-tier-qr.png`  
**UPI String**: `upi://pay?pa=scammer@paytm&pn=Fake%20Merchant&am=2500&cu=INR&tn=Verification%20Payment`  
**Expected Behavior**:
- **Risk Tier**: Red (Trust Score 0-39)
- **UI**: Full-screen red background, "STOP" header
- **Warning**: "This account is linked to fraud"
- **Countdown**: 5-second delay before allowing proceed
- **Button**: "Cancel & Report" (white background)
- **Description**: Known scammer VPA in blacklist

### 4. Red Tier - Collect Request Pattern 🚨
**File**: `collectRequest-tier-qr.png`  
**UPI String**: `upi://pay?pa=unknown@phonepe&pn=Random&am=500&cu=INR&mode=02&tn=Collect%20Request`  
**Expected Behavior**:
- **Risk Tier**: Red (Trust Score 0-39)
- **UI**: Full-screen red background, "STOP" header
- **Warning**: "Collect Request pattern detected"
- **Risk Breakdown**: Shows heuristics penalty
- **Description**: Collect request pattern (mode=02)

---

## Testing Instructions

### Method 1: Scan from Computer Screen
1. Open the QR code PNG file on your computer
2. Launch Shabari app on your phone
3. Tap "Scan QR Code" button
4. Point camera at the QR code on your screen
5. Verify the risk assessment screen displays correctly

### Method 2: Print and Scan
1. Print the QR code PNG files
2. Launch Shabari app
3. Scan the printed QR codes
4. Verify fraud detection results

### Method 3: Gallery Import
1. Transfer QR code PNG files to your phone
2. Launch Shabari app
3. Tap "Scan QR Code"
4. Tap the gallery icon (top-right)
5. Select a QR code image
6. Verify risk assessment

---

## Test Validation Checklist

For each QR code, verify:

- [ ] **Camera Permission**: App requests camera permission on first scan
- [ ] **QR Detection**: Camera successfully detects and scans QR code
- [ ] **Haptic Feedback**: Phone vibrates on successful scan
- [ ] **Loading State**: "Verifying..." screen appears briefly
- [ ] **Risk Assessment**: Correct tier (Green/Yellow/Red) is displayed
- [ ] **Trust Score**: Score is within expected range
- [ ] **UI Elements**: All text, icons, and buttons render correctly
- [ ] **Risk Breakdown**: Reputation, Heuristics, and Identity scores shown
- [ ] **VPA Display**: VPA is correctly extracted and displayed
- [ ] **Amount Display**: Amount is correctly parsed and shown (if present)
- [ ] **Countdown Timer**: 5-second countdown works for Red tier
- [ ] **Button States**: Buttons are enabled/disabled correctly
- [ ] **Navigation**: "Cancel" button returns to home screen
- [ ] **Scan History**: Scan is saved to history after assessment
- [ ] **UPI Intent**: "Pay" button opens payment app (GPay/PhonePe)

---

## Backend API Tests

The fraud detection logic has been validated with 13 passing unit tests:

### UPI Parsing (3 tests)
- ✅ Parse UPI string correctly
- ✅ Handle URL-encoded transaction notes
- ✅ Detect collect request mode

### Risk Scoring Logic (4 tests)
- ✅ Calculate reputation score (40% weight)
- ✅ Calculate heuristics score (30% weight)
- ✅ Calculate identity score (30% weight)
- ✅ Calculate final risk score correctly

### Tier Assignment (3 tests)
- ✅ Assign Green tier for score 80-100
- ✅ Assign Yellow tier for score 40-79
- ✅ Assign Red tier for score 0-39

### NPCI Compliance (3 tests)
- ✅ Flag P2P collect requests above ₹2,000
- ✅ Allow P2P collect requests below ₹2,000
- ✅ Allow pay mode regardless of amount

---

## Risk Scoring Formula

```
Risk Score = 100 - (Reputation Penalty + Heuristics Penalty + Identity Penalty)

Reputation (40%):
- Blacklisted VPA: -40 points
- Clean VPA: 0 points

Heuristics (30%):
- Collect Request (mode=02): -30 points
- NPCI non-compliant (>₹2000): -30 points
- Suspicious transaction note: -30 points
- Normal payment: 0 points

Identity (30%):
- Name mismatch: -30 points
- Name match: 0 points

Tier Assignment:
- Green: 80-100 (Low Risk)
- Yellow: 40-79 (Medium Risk)
- Red: 0-39 (High Risk)
```

---

## Known Limitations

1. **VPA Verification**: Currently using mock data. Real VPA verification requires Cashfree/Razorpay API integration.
2. **Blacklist Database**: Using in-memory mock blacklist. Production should use MySQL database.
3. **Link Scanning**: Google Safe Browsing and VirusTotal require API keys to be configured.
4. **Notification Monitoring**: Silent Guard requires native Android NotificationListenerService (not available in Expo Go).

---

## Next Steps

1. **Real Device Testing**: Test on physical Android/iOS devices with Expo Go
2. **APK Build Testing**: Generate APK and test camera functionality
3. **Real UPI QR Codes**: Test with actual merchant QR codes from PhonePe/GPay
4. **API Integration**: Connect real VPA verification API (Cashfree/Razorpay)
5. **Database Setup**: Populate MySQL database with real fraud VPA data
6. **Performance Testing**: Measure scan-to-assessment latency (<2 seconds target)

---

## Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted in phone settings
- Try restarting the app
- Check if other apps can access the camera

### QR Code Not Detected
- Ensure good lighting conditions
- Hold phone steady 15-30cm from QR code
- Try adjusting angle or distance

### Black Screen in Camera
- This was a known issue, fixed in checkpoint 7c9e1d58
- Update to latest checkpoint if still occurring

### API Connection Failed
- Ensure dev server is running
- Check network connectivity
- Verify backend server is accessible

---

## Test Results

Run the automated tests:

```bash
# Test fraud detection logic
pnpm test fraud-api

# Test Silent Guard patterns
pnpm test silent-guard-logic

# Test scan history
pnpm test scan-history
```

All tests should pass before deploying to production.
