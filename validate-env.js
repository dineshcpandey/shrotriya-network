#!/usr/bin/env node

// Environment validation script
// Run this script to validate your environment configuration

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Environment Configuration...\n');

// Load environment variables
require('dotenv').config();

// Required environment variables
const requiredVars = [
    'PORT',
    'NODE_ENV',
    'BASE_URL',
    'DB_HOST',
    'DB_USER',
    'DB_NAME',
    'DB_PASSWORD'
];

// Optional but recommended variables
const recommendedVars = [
    'API_BASE_URL',
    'AUTH_BASE_URL',
    'IMAGE_BASE_URL',
    'IMAGE_SERVE_URL',
    'FRONTEND_URL',
    'DEFAULT_AVATAR_URL',
    'FACEBOOK_GRAPH_URL',
    'JWT_SECRET'
];

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('✅ Checking Required Variables:');
requiredVars.forEach(varName => {
    if (process.env[varName]) {
        console.log(`  ✓ ${varName}: ${process.env[varName]}`);
    } else {
        console.log(`  ❌ ${varName}: MISSING`);
        hasErrors = true;
    }
});

console.log('\n⚠️  Checking Recommended Variables:');
recommendedVars.forEach(varName => {
    if (process.env[varName]) {
        console.log(`  ✓ ${varName}: ${process.env[varName]}`);
    } else {
        console.log(`  ⚠️  ${varName}: Using default value`);
        hasWarnings = true;
    }
});

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('\n📄 .env file: Found');
} else {
    console.log('\n❌ .env file: Not found');
    hasErrors = true;
}

// Check if uploads directory exists
const uploadsPath = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsPath)) {
    console.log('📁 uploads directory: Found');
} else {
    console.log('⚠️  uploads directory: Will be created automatically');
    hasWarnings = true;
}

// Validate URL formats
console.log('\n🔗 Validating URL Formats:');
const urlVars = ['BASE_URL', 'API_BASE_URL', 'AUTH_BASE_URL', 'IMAGE_BASE_URL', 'IMAGE_SERVE_URL', 'FRONTEND_URL'];
urlVars.forEach(varName => {
    const url = process.env[varName];
    if (url) {
        try {
            new URL(url);
            console.log(`  ✓ ${varName}: Valid URL format`);
        } catch (error) {
            console.log(`  ❌ ${varName}: Invalid URL format - ${url}`);
            hasErrors = true;
        }
    }
});

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
    console.log('❌ Configuration has ERRORS that must be fixed');
    process.exit(1);
} else if (hasWarnings) {
    console.log('⚠️  Configuration has warnings but should work with defaults');
    console.log('✅ Ready to start the application');
    process.exit(0);
} else {
    console.log('✅ Configuration is complete and valid');
    console.log('🚀 Ready to start the application');
    process.exit(0);
}
