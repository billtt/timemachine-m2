const mongoose = require('mongoose');

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

async function inspectSlices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/time');
    console.log('Connected to MongoDB');

    // Find slices with problematic content
    const problemSlices = await Slice.find({
      $or: [
        { content: { $exists: false } },
        { content: null },
        { content: '' },
        { content: { $type: 'object' } },
        { content: { $type: 'array' } }
      ]
    }).lean();

    console.log(`\nFound ${problemSlices.length} slices with problematic content:`);
    
    for (const slice of problemSlices) {
      console.log(`\nSlice ID: ${slice._id}`);
      console.log(`User: ${slice.user}`);
      console.log(`Type: ${slice.type}`);
      console.log(`Time: ${slice.time}`);
      console.log(`Content type: ${typeof slice.content}`);
      console.log(`Content value: ${JSON.stringify(slice.content)}`);
      console.log(`Content exists: ${slice.hasOwnProperty('content')}`);
      console.log(`Created: ${slice.createdAt}`);
      console.log(`Updated: ${slice.updatedAt}`);
    }

    // Also check for slices with very short content (might be problematic)
    const shortContent = await Slice.find({
      content: { $exists: true, $type: 'string' },
      $expr: { $lt: [{ $strLenCP: '$content' }, 1] }
    }).lean();

    console.log(`\n\nFound ${shortContent.length} slices with empty string content:`);
    for (const slice of shortContent) {
      console.log(`Slice ID: ${slice._id}, User: ${slice.user}, Content: "${slice.content}"`);
    }

    // Get total count for context
    const totalSlices = await Slice.countDocuments();
    console.log(`\n\nTotal slices in database: ${totalSlices}`);
    console.log(`Problematic slices: ${problemSlices.length}`);
    console.log(`Empty string slices: ${shortContent.length}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error inspecting slices:', error);
    process.exit(1);
  }
}

inspectSlices();