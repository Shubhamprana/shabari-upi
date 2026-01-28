const fs = require('fs');
const path = require('path');
const os = require('os');

// Standard Gradle cache location on Windows
const gradleHome = path.join(os.homedir(), '.gradle');
const cachesDir = path.join(gradleHome, 'caches');

console.log(`Scanning Gradle caches in: ${cachesDir}`);

function patchFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        // Header check
        if (!content.includes('#include <cstdio>')) {
            content = content.replace('#include <array>', '#include <array>\n#include <cstdio>');
        }
        
        // Remove <format> include if present
        content = content.replace(/#include <format>[\r\n]+/, '');

        // Replace std::format usage
        const searchString = 'return std::format("{}%", dimension.value);';
        const replacementString = `std::array<char, 64> buffer{};
    std::snprintf(buffer.data(), buffer.size(), "%g%%", dimension.value);
    return std::string(buffer.data());`;

        if (content.includes(searchString)) {
            content = content.replace(searchString, replacementString);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Patched: ${filePath}`);
        } else if (originalContent !== content) {
             // Saved mostly for the include fix
             fs.writeFileSync(filePath, content, 'utf8');
             console.log(`✅ Patched (headers only): ${filePath}`);
        } else {
            // console.log(`Tests passed (already patched): ${filePath}`);
        }

    } catch (err) {
        console.error(`❌ Failed to patch ${filePath}: ${err.message}`);
    }
}

function walkDir(directory) {
    if (!fs.existsSync(directory)) return;

    try {
        const files = fs.readdirSync(directory);
        for (const file of files) {
            const fullPath = path.join(directory, file);
            try {
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    // Optimization: Only look into transforms/transforms-* folders or similar structure
                    // But to be safe, we search generically but skip obviously wrong folders if needed
                    walkDir(fullPath);
                } else if (file === 'graphicsConversions.h') {
                    patchFile(fullPath);
                }
            } catch (e) {
                // Ignore access errors
            }
        }
    } catch (e) {
        // Ignore read errors
    }
}

// Start scanning
if (fs.existsSync(cachesDir)) {
    console.log("Starting scan... this might take a minute.");
    walkDir(cachesDir);
    console.log("Scan complete.");
} else {
    console.error("Gradle cache directory not found!");
}
