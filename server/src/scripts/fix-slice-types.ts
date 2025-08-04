#!/usr/bin/env node

import { connectDatabase, disconnectDatabase } from '../config/database';
import { Slice } from '../models/Slice';
import { SLICE_TYPES } from '../types/shared';

/**
 * Fix unknown slice types in the database by normalizing them to 'other'
 * This script finds all slices with types not in the current SLICE_TYPES array
 * and updates them to use 'other' instead.
 */

async function fixSliceTypes() {
  console.log('🔧 Starting slice type normalization...');
  
  try {
    await connectDatabase();
    console.log('✅ Connected to database');

    // Find all slices with unknown types
    const unknownTypeSlices = await Slice.find({
      type: { $nin: SLICE_TYPES }
    });

    console.log(`📊 Found ${unknownTypeSlices.length} slices with unknown types`);

    if (unknownTypeSlices.length === 0) {
      console.log('✅ No slices with unknown types found');
      return;
    }

    // Log the unknown types found
    const unknownTypes = [...new Set(unknownTypeSlices.map(s => s.type))];
    console.log('🔍 Unknown types found:', unknownTypes);

    let processedCount = 0;
    let errorCount = 0;

    // Process each slice
    for (const slice of unknownTypeSlices) {
      try {
        const originalType = slice.type;
        slice.type = 'other' as any;
        
        // Use updateOne to bypass validation issues
        await Slice.updateOne(
          { _id: slice._id },
          { $set: { type: 'other' } }
        );

        processedCount++;
        console.log(`✅ Normalized slice ${slice._id}: '${originalType}' → 'other'`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to process slice ${slice._id}:`, error);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  Total slices found: ${unknownTypeSlices.length}`);
    console.log(`  Successfully processed: ${processedCount}`);
    console.log(`  Errors: ${errorCount}`);

    if (processedCount > 0) {
      console.log('\n✅ Slice type normalization completed successfully!');
      console.log('💡 Unknown types have been normalized to "other"');
      console.log('💡 You can now safely run encryption key rotation');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    console.log('📝 Database connection closed');
  }
}

// Run the script if called directly
if (require.main === module) {
  fixSliceTypes()
    .then(() => {
      console.log('🎉 Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { fixSliceTypes };