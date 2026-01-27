import QRCode from "qrcode";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * Test UPI QR Code Generation and API Testing
 * Generates sample UPI QR codes for different risk scenarios
 */

// Test UPI strings for different risk tiers
const testUpiStrings = {
  green: {
    name: "Green Tier - Verified Merchant",
    upi: "upi://pay?pa=merchant@paytm&pn=Amazon&am=500&cu=INR&tn=Order%20Payment",
    description: "Legitimate merchant with matching name",
  },
  yellow: {
    name: "Yellow Tier - Name Mismatch",
    upi: "upi://pay?pa=john123@ybl&pn=Flipkart&am=1000&cu=INR&tn=Product%20Payment",
    description: "VPA name doesn't match merchant name",
  },
  red: {
    name: "Red Tier - Blacklisted VPA",
    upi: "upi://pay?pa=scammer@paytm&pn=Fake%20Merchant&am=2500&cu=INR&tn=Verification%20Payment",
    description: "Known scammer VPA in blacklist",
  },
  collectRequest: {
    name: "Red Tier - Collect Request Pattern",
    upi: "upi://pay?pa=unknown@phonepe&pn=Random&am=500&cu=INR&mode=02&tn=Collect%20Request",
    description: "Collect request pattern detected (mode=02)",
  },
};

async function generateQRCodes() {
  console.log("🔍 Generating Test UPI QR Codes...\n");

  const outputDir = join(__dirname, "../test-qr-codes");

  for (const [key, test] of Object.entries(testUpiStrings)) {
    try {
      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(test.upi, {
        errorCorrectionLevel: "M",
        type: "image/png",
        width: 512,
        margin: 2,
      });

      // Extract base64 data
      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Save to file
      const filename = `${key}-tier-qr.png`;
      const filepath = join(outputDir, filename);
      writeFileSync(filepath, buffer);

      console.log(`✅ ${test.name}`);
      console.log(`   File: ${filename}`);
      console.log(`   UPI: ${test.upi}`);
      console.log(`   Description: ${test.description}\n`);
    } catch (error) {
      console.error(`❌ Error generating ${key}:`, error);
    }
  }
}

async function testBackendAPI() {
  console.log("\n🧪 Testing Backend Fraud Detection API...\n");

  const apiUrl = "http://127.0.0.1:3000/trpc/fraud.scanQr";

  for (const [key, test] of Object.entries(testUpiStrings)) {
    try {
      console.log(`Testing: ${test.name}`);
      console.log(`UPI String: ${test.upi}`);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          upiString: test.upi,
        }),
      });

      if (!response.ok) {
        console.error(`❌ API Error: ${response.status} ${response.statusText}\n`);
        continue;
      }

      const result = await response.json();
      const assessment = result.result?.data?.riskAssessment;

      if (assessment) {
        console.log(`✅ Risk Assessment:`);
        console.log(`   Tier: ${assessment.tier.toUpperCase()}`);
        console.log(`   Score: ${assessment.score}/100`);
        console.log(`   Breakdown:`);
        console.log(`     - Reputation: ${assessment.breakdown.reputation}`);
        console.log(`     - Heuristics: ${assessment.breakdown.heuristics}`);
        console.log(`     - Identity: ${assessment.breakdown.identity}\n`);
      } else {
        console.log(`⚠️  No assessment data returned\n`);
      }
    } catch (error) {
      console.error(`❌ Error testing ${key}:`, error);
      console.log();
    }
  }
}

// Run tests
async function runTests() {
  console.log("=".repeat(60));
  console.log("Shabari QR Code End-to-End Testing");
  console.log("=".repeat(60) + "\n");

  // Create output directory
  const outputDir = join(__dirname, "../test-qr-codes");
  try {
    const fs = require("fs");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  } catch (error) {
    console.error("Error creating output directory:", error);
  }

  await generateQRCodes();
  await testBackendAPI();

  console.log("=".repeat(60));
  console.log("Testing Complete!");
  console.log("=".repeat(60));
}

runTests().catch(console.error);
