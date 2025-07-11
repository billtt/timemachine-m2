import { connectDatabase } from '../config/database';
import { User } from '../models/User';
import { Slice } from '../models/Slice';
import mongoose from 'mongoose';

/**
 * Migration script to ensure compatibility with existing database
 * This script:
 * 1. Checks existing data structure
 * 2. Adds missing indexes
 * 3. Updates any legacy data formats
 * 4. Validates data integrity
 */

async function migrate() {
  console.log('🔄 Starting database migration...');
  
  try {
    // Connect to database
    await connectDatabase();
    
    // Check and create indexes
    console.log('📊 Checking database indexes...');
    await ensureIndexes();
    
    // Validate existing data
    console.log('✅ Validating existing data...');
    await validateData();
    
    // Migration complete
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

async function ensureIndexes() {
  try {
    // User model indexes
    await User.collection.createIndex({ name: 1 }, { unique: true });
    await User.collection.createIndex({ email: 1 }, { sparse: true });
    await User.collection.createIndex({ token: 1 }, { sparse: true });
    
    // Slice model indexes
    await Slice.collection.createIndex({ user: 1, time: -1 });
    await Slice.collection.createIndex({ user: 1, type: 1 });
    await Slice.collection.createIndex({ user: 1, createdAt: -1 });
    await Slice.collection.createIndex({ content: 'text' });
    
    console.log('✅ Database indexes created/verified');
  } catch (error) {
    console.error('❌ Failed to create indexes:', error);
    throw error;
  }
}

async function validateData() {
  try {
    // Check users
    const userCount = await User.countDocuments();
    console.log(`📊 Found ${userCount} users`);
    
    // Check slices
    const sliceCount = await Slice.countDocuments();
    console.log(`📊 Found ${sliceCount} slices`);
    
    // Check for any legacy data issues
    const usersWithoutCreatedAt = await User.countDocuments({ createdAt: { $exists: false } });
    const slicesWithoutCreatedAt = await Slice.countDocuments({ createdAt: { $exists: false } });
    
    if (usersWithoutCreatedAt > 0) {
      console.log(`⚠️  Found ${usersWithoutCreatedAt} users without createdAt field`);
      // Add createdAt to users without it
      await User.updateMany(
        { createdAt: { $exists: false } },
        { $set: { createdAt: new Date(), updatedAt: new Date() } }
      );
      console.log('✅ Added createdAt to legacy users');
    }
    
    if (slicesWithoutCreatedAt > 0) {
      console.log(`⚠️  Found ${slicesWithoutCreatedAt} slices without createdAt field`);
      // Add createdAt to slices without it (use time field as fallback)
      const slicesWithoutTimestamp = await Slice.find({ createdAt: { $exists: false } });
      for (const slice of slicesWithoutTimestamp) {
        slice.createdAt = slice.time || new Date();
        slice.updatedAt = slice.time || new Date();
        await slice.save();
      }
      console.log('✅ Added createdAt to legacy slices');
    }
    
    // Check for invalid slice types
    const invalidSlices = await Slice.find({
      type: { $nin: ['work', 'fun', 'gym', 'reading', 'other'] }
    });
    
    if (invalidSlices.length > 0) {
      console.log(`⚠️  Found ${invalidSlices.length} slices with invalid types`);
      // Fix invalid types
      await Slice.updateMany(
        { type: { $nin: ['work', 'fun', 'gym', 'reading', 'other'] } },
        { $set: { type: 'other' } }
      );
      console.log('✅ Fixed invalid slice types');
    }
    
    console.log('✅ Data validation completed');
    
  } catch (error) {
    console.error('❌ Data validation failed:', error);
    throw error;
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrate();
}

export { migrate };