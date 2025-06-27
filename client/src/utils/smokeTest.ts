import { runSmokeTest } from './healthCheck';
import Logger from './logger';

/**
 * This script runs a smoke test on the trading system
 * It can be executed from the command line with:
 * node -r esm src/utils/smokeTest.js
 */
async function main() {
  console.log('Starting trading system smoke test...');
  
  try {
    const results = await runSmokeTest();
    
    console.log('\n=== SMOKE TEST RESULTS ===');
    console.log(`Overall status: ${results.success ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log('\nTest details:');
    
    results.tests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.name}: ${test.passed ? 'PASSED ✅' : 'FAILED ❌'}`);
      console.log(`   ${test.message}`);
    });
    
    if (!results.success) {
      Logger.error('\n⚠️ Some tests failed. Please check the logs for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed successfully!');
      process.exit(0);
    }
  } catch (error) {
    Logger.error('Smoke test failed with unexpected error:', error);
    process.exit(1);
  }
}

// Run the smoke test if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  main();
}

export default main;