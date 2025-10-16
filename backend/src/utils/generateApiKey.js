#!/usr/bin/env node

// API Key Generation Utility
// Usage: node generateApiKey.js [count] [length]

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate a secure random API key
function generateApiKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// Hash an API key
function hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Generate multiple keys
function generateMultipleKeys(count = 1, length = 32) {
    const keys = [];
    for (let i = 0; i < count; i++) {
        keys.push(generateApiKey(length));
    }
    return keys;
}

// Save keys to file
function saveKeysToFile(keys, filename = 'api-keys.txt') {
    const timestamp = new Date().toISOString();
    const content = [
        '# Urban Mobility Data Explorer - API Keys',
        `# Generated: ${timestamp}`,
        '# KEEP THESE KEYS SECURE - DO NOT COMMIT TO VERSION CONTROL',
        '#',
        '# Add these keys to your .env file:',
        `# API_KEYS=${keys.join(',')}`,
        '#',
        '# Individual keys:',
        ...keys.map((key, index) => `\n# Key ${index + 1}:\n${key}`),
        '',
        '# Hashed keys (for reference):',
        ...keys.map((key, index) => `# Key ${index + 1} (SHA-256): ${hashApiKey(key)}`),
        ''
    ].join('\n');
    
    const outputPath = path.join(process.cwd(), filename);
    fs.writeFileSync(outputPath, content);
    
    return outputPath;
}

// Display generated keys
function displayKeys(keys) {
    console.log('\n' + '='.repeat(80));
    console.log('  URBAN MOBILITY DATA EXPLORER - API KEYS');
    console.log('='.repeat(80));
    console.log('\nIMPORTANT: Keep these keys secure. Do not share or commit to version control.\n');
    
    console.log('Generated API Keys:\n');
    keys.forEach((key, index) => {
        console.log(`Key ${index + 1}:`);
        console.log(`  ${key}`);
        console.log(`  (SHA-256: ${hashApiKey(key)})`);
        console.log('');
    });
    
    console.log('Add to your .env file:');
    console.log(`  API_KEYS=${keys.join(',')}`);
    console.log('');
    
    console.log('Or add individually:');
    keys.forEach((key, index) => {
        console.log(`  API_KEY_${index + 1}=${key}`);
    });
    console.log('');
    
    console.log('Usage in requests:');
    console.log('  curl -H "X-API-Key: YOUR_KEY_HERE" http://localhost:8000/api/endpoint');
    console.log('  or');
    console.log('  curl "http://localhost:8000/api/endpoint?api_key=YOUR_KEY_HERE"');
    console.log('');
    
    console.log('='.repeat(80));
    console.log('');
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const quietMode = args.includes('--quiet') || args.includes('-q');
    const count = parseInt(args[0]) || 1;
    const length = parseInt(args[1]) || 32;
    const saveToFile = args.includes('--save') || args.includes('-s');
    
    // If quiet mode, just output the key and exit
    if (quietMode) {
        const key = generateApiKey(length);
        process.stdout.write(key);
        process.exit(0);
    }
    
    // Validate arguments
    if (count < 1 || count > 100) {
        console.error('Error: Count must be between 1 and 100');
        process.exit(1);
    }
    
    if (length < 16 || length > 128) {
        console.error('Error: Length must be between 16 and 128 bytes');
        process.exit(1);
    }
    
    // Generate keys
    const keys = generateMultipleKeys(count, length);
    
    // Display keys
    displayKeys(keys);
    
    // Save to file if requested
    if (saveToFile) {
        const filename = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'api-keys.txt';
        const savedPath = saveKeysToFile(keys, filename);
        console.log(`Keys saved to: ${savedPath}`);
        console.log('Remember to add this file to .gitignore!\n');
    } else {
        console.log('Tip: Use --save or -s flag to save keys to a file\n');
    }
}

module.exports = {
    generateApiKey,
    hashApiKey,
    generateMultipleKeys,
    saveKeysToFile
};

