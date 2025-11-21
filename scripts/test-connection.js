const { connectToDatabase, disconnectFromDatabase, getConnectionStatus } = require('../config/connection');

async function testConnection() {
  try {
    console.log('🔌 Testing MongoDB connection...\n');
    
    const connection = await connectToDatabase();
    
    console.log('\n📊 Connection Status:');
    const status = getConnectionStatus();
    console.log(JSON.stringify(status, null, 2));
    
    // Test database operations
    console.log('\n🧪 Testing database operations...');
    
    const Repository = require('../models/Repository');
    const count = await Repository.countDocuments();
    console.log(`✅ Repository model works. Current repositories: ${count}`);
    
    const Analysis = require('../models/Analysis');
    const analysisCount = await Analysis.countDocuments();
    console.log(`✅ Analysis model works. Current analyses: ${analysisCount}`);
    
    const Alert = require('../models/Alert');
    const alertCount = await Alert.countDocuments();
    console.log(`✅ Alert model works. Current alerts: ${alertCount}`);
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
  }
}

testConnection();

