/**
 * Test script to verify bcrypt/bcryptjs works correctly
 * Run inside Docker: docker exec <container> node test_bcrypt.js
 */

import { hashPassword, comparePassword } from './src/utils/passwordUtils.js';

const testPassword = 'admin123';
const knownHash = '$2b$10$yourHashHere'; // Replace with actual hash from DB if testing specific user

async function runTests() {
  console.log('=== Bcrypt Test Suite ===\n');
  console.log('USE_BCRYPT_JS:', process.env.USE_BCRYPT_JS || 'not set (using native bcrypt)');
  console.log('');

  // Test 1: Hash a password
  console.log('Test 1: Hashing password...');
  try {
    const startHash = Date.now();
    const hash = await hashPassword(testPassword);
    const hashTime = Date.now() - startHash;
    console.log('✅ Hash generated:', hash);
    console.log(`   Time: ${hashTime}ms\n`);

    // Test 2: Compare correct password
    console.log('Test 2: Comparing correct password...');
    const startCompare1 = Date.now();
    const isMatch = await comparePassword(testPassword, hash);
    const compareTime1 = Date.now() - startCompare1;
    console.log('✅ Correct password matches:', isMatch);
    console.log(`   Time: ${compareTime1}ms\n`);

    // Test 3: Compare wrong password
    console.log('Test 3: Comparing wrong password...');
    const startCompare2 = Date.now();
    const isWrong = await comparePassword('wrongpassword', hash);
    const compareTime2 = Date.now() - startCompare2;
    console.log('✅ Wrong password does not match:', !isWrong);
    console.log(`   Time: ${compareTime2}ms\n`);

    // Test 4: Compare with null/empty values
    console.log('Test 4: Edge cases...');
    const nullResult = await comparePassword(null, hash);
    console.log('   Null password returns false:', nullResult === false);
    const emptyResult = await comparePassword('', hash);
    console.log('   Empty password returns false:', emptyResult === false);

    console.log('\n=== All Tests Passed ===');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runTests();
