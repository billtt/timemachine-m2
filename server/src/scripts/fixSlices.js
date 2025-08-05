const mongoose = require('mongoose');
const { ENCRYPTION_MESSAGES } = require('../../../shared/constants');

// Define the slice schema directly since we can't import from TypeScript
const sliceSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 1000
  },
  type: {
    type: String,
    required: true,
    enum: ['work', 'fun', 'gym', 'reading', 'other'],
    default: 'other'
  },
  user: {
    type: String,
    required: true,
    trim: true
  },
  time: {
    type: Date,
    required: true,
    default: Date.now
  },
  searchTokens: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

const Slice = mongoose.model('Slice', sliceSchema);

require('dotenv').config({ path: '.env.dev' });

async function fixSlices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/time');
    console.log('Connected to MongoDB');

    let totalFixed = 0;

    // Fix slices with missing content field
    console.log('\n1. Fixing slices with missing content field...');
    const missingContentResult = await Slice.updateMany(
      { content: { $exists: false } },
      { $set: { content: ENCRYPTION_MESSAGES.MISSING_CONTENT } }
    );
    console.log(`Fixed ${missingContentResult.modifiedCount} slices with missing content field`);
    totalFixed += missingContentResult.modifiedCount;

    // Fix slices with null content
    console.log('\n2. Fixing slices with null content...');
    const nullContentResult = await Slice.updateMany(
      { content: null },
      { $set: { content: ENCRYPTION_MESSAGES.NULL_CONTENT } }
    );
    console.log(`Fixed ${nullContentResult.modifiedCount} slices with null content`);
    totalFixed += nullContentResult.modifiedCount;

    // Fix slices with empty string content
    console.log('\n3. Fixing slices with empty string content...');
    const emptyContentResult = await Slice.updateMany(
      { content: '' },
      { $set: { content: ENCRYPTION_MESSAGES.EMPTY_CONTENT } }
    );
    console.log(`Fixed ${emptyContentResult.modifiedCount} slices with empty string content`);
    totalFixed += emptyContentResult.modifiedCount;

    // Fix slices with non-string content (just in case)
    console.log('\n4. Fixing slices with non-string content...');
    const nonStringResult = await Slice.updateMany(
      { 
        content: { $exists: true },
        $expr: { $ne: [{ $type: '$content' }, 'string'] }
      },
      { $set: { content: ENCRYPTION_MESSAGES.INVALID_CONTENT } }
    );
    console.log(`Fixed ${nonStringResult.modifiedCount} slices with non-string content`);
    totalFixed += nonStringResult.modifiedCount;

    console.log(`\n✅ Total slices fixed: ${totalFixed}`);

    // Verify the fixes
    console.log('\n5. Verifying fixes...');
    const remainingProblems = await Slice.find({
      $or: [
        { content: { $exists: false } },
        { content: null },
        { content: '' },
        { content: { $type: 'object' } },
        { content: { $type: 'array' } }
      ]
    }).lean();

    if (remainingProblems.length === 0) {
      console.log('✅ All problematic slices have been fixed!');
    } else {
      console.log(`❌ ${remainingProblems.length} problematic slices still remain:`);
      for (const slice of remainingProblems) {
        console.log(`  - Slice ID: ${slice._id}, Content: ${JSON.stringify(slice.content)}`);
      }
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error fixing slices:', error);
    process.exit(1);
  }
}

fixSlices();