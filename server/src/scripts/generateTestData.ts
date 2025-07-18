#!/usr/bin/env node

import { connectDatabase } from '../config/database';
import { Slice } from '../models/Slice';
import { User } from '../models/User';

// Test data templates
const testActivities = [
  // Work activities
  "attended daily standup meeting",
  "worked on project documentation",
  "fixed bug in user authentication",
  "reviewed pull request from team member",
  "deployed new feature to production",
  "had meeting with client about requirements",
  "refactored legacy code for better performance",
  "wrote unit tests for new API endpoints",
  "participated in sprint planning session",
  "updated project timeline and milestones",
  
  // Personal activities
  "went for a morning run in the park",
  "had coffee with friends at local cafe",
  "read chapter of new book",
  "watched documentary about space exploration",
  "cooked dinner for family",
  "practiced guitar for 30 minutes",
  "organized closet and donated old clothes",
  "called parents to catch up",
  "went grocery shopping for the week",
  "played board games with roommates",
  
  // Learning activities
  "studied new programming language tutorial",
  "watched online course about data structures",
  "practiced coding challenges on platform",
  "read technical blog about system design",
  "attended virtual tech meetup",
  "completed online certification module",
  "researched best practices for testing",
  "learned about new framework features",
  "practiced design patterns implementation",
  "reviewed open source project code",
  
  // Health & Fitness
  "completed 45-minute yoga session",
  "went to gym for strength training",
  "took long walk around neighborhood",
  "prepared healthy meal prep for week",
  "meditated for 20 minutes",
  "went swimming at local pool",
  "joined cycling group for weekend ride",
  "attended fitness class at gym",
  "practiced stretching routine",
  "tracked daily water intake",
  
  // Hobbies & Entertainment
  "worked on art project in spare time",
  "played video games with online friends",
  "watched new episode of favorite series",
  "visited museum exhibition downtown",
  "attended concert at local venue",
  "tried new restaurant in neighborhood",
  "went to movies with friends",
  "worked on puzzle during evening",
  "listened to new podcast episode",
  "browsed photography portfolio online"
];

const sliceTypes = ['work', 'fun', 'gym', 'reading', 'other'] as const;

// Generate random content
function generateRandomContent(): string {
  const activity = testActivities[Math.floor(Math.random() * testActivities.length)];
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `[test] ${activity} ${randomSuffix}`;
}

// Generate random date within the last year
function generateRandomDate(): Date {
  const now = new Date();
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const randomTime = yearAgo.getTime() + Math.random() * (now.getTime() - yearAgo.getTime());
  return new Date(randomTime);
}

// Generate random slice type
function generateRandomType(): typeof sliceTypes[number] {
  return sliceTypes[Math.floor(Math.random() * sliceTypes.length)]!;
}

// Main function to generate test data
async function generateTestData() {
  console.log('🚀 Starting test data generation...');
  
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const username = args[0] || 'admin'; // Default username
    const count = parseInt(args[1] || '200') || 200; // Default count
    
    console.log(`👤 Target user: ${username}`);
    console.log(`📊 Generating ${count} test slices...`);
    
    // Check if user exists (User model uses 'name' not 'username')
    let user = await User.findOne({ name: username });
    if (!user) {
      console.error(`❌ User '${username}' not found`);
      console.log('Available users:');
      const users = await User.find({}).select('name email').lean();
      if (users.length === 0) {
        console.log('  No users found in database');
        console.log('  Would you like to create a test user? (Creating test user...)');
        
        // Create a test user
        user = new User({
          name: username,
          email: `${username}@test.com`,
          password: 'testpassword123' // This will be hashed by the pre-save hook
        });
        await user.save();
        console.log(`✅ Created test user: ${user.name} (${user.email})`);
      } else {
        users.forEach(u => console.log(`  - ${u.name} (${u.email || 'no email'})`));
        console.log(`\n💡 Use one of the existing usernames, or create user '${username}' first`);
        process.exit(1);
      }
    }
    
    console.log(`✅ Found user: ${user.name} (${user.email})`);
    
    // Generate test slices
    const testSlices = [];
    for (let i = 0; i < count; i++) {
      testSlices.push({
        content: generateRandomContent(),
        type: generateRandomType(),
        time: generateRandomDate(),
        user: user.name, // Use name for v1.0 compatibility
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Sort by time (oldest first)
    testSlices.sort((a, b) => a.time.getTime() - b.time.getTime());
    
    // Insert in batches to avoid overwhelming the database
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < testSlices.length; i += batchSize) {
      const batch = testSlices.slice(i, i + batchSize);
      await Slice.insertMany(batch);
      inserted += batch.length;
      
      // Progress indicator
      const progress = Math.round((inserted / count) * 100);
      process.stdout.write(`\r📝 Inserted ${inserted}/${count} slices (${progress}%)`);
    }
    
    console.log('\n✅ Test data generation completed!');
    
    // Show summary
    const summary = await Slice.aggregate([
      { $match: { user: user.name, content: { $regex: '^\\[test\\]' } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 Test data summary:');
    summary.forEach(item => {
      console.log(`  ${item._id}: ${item.count} slices`);
    });
    
    // Show date range
    const dateRange = await Slice.aggregate([
      { $match: { user: user.name, content: { $regex: '^\\[test\\]' } } },
      { $group: { 
        _id: null, 
        earliest: { $min: '$time' }, 
        latest: { $max: '$time' } 
      }}
    ]);
    
    if (dateRange.length > 0) {
      console.log('\n📅 Date range:');
      console.log(`  From: ${dateRange[0].earliest.toISOString().split('T')[0]}`);
      console.log(`  To: ${dateRange[0].latest.toISOString().split('T')[0]}`);
    }
    
    console.log('\n🎯 Testing suggestions:');
    console.log('  - Search for "[test]" to find all test slices');
    console.log('  - Search for "meeting" to test infinite scroll');
    console.log('  - Search for "project" to test pagination');
    console.log('  - Use regex search with "\\[test\\].*work" pattern');
    
  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Cleanup function to remove test data
async function cleanupTestData() {
  console.log('🧹 Starting test data cleanup...');
  
  try {
    await connectDatabase();
    console.log('✅ Connected to database');
    
    const args = process.argv.slice(3); // Skip 'cleanup' argument
    const username = args[0] || 'admin';
    
    console.log(`👤 Target user: ${username}`);
    
    // Delete all test slices
    const result = await Slice.deleteMany({ 
      user: username, 
      content: { $regex: '^\\[test\\]' } 
    });
    
    console.log(`✅ Deleted ${result.deletedCount} test slices`);
    
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// List users function
async function listUsers() {
  console.log('👥 Listing all users in database...');
  
  try {
    await connectDatabase();
    console.log('✅ Connected to database');
    
    const users = await User.find({}).select('name email createdAt').lean();
    
    if (users.length === 0) {
      console.log('📭 No users found in database');
      console.log('💡 Create a user by registering through the web app first');
    } else {
      console.log(`\n📊 Found ${users.length} users:`);
      users.forEach((u, index) => {
        console.log(`  ${index + 1}. ${u.name} (${u.email || 'no email'}) - created ${u.createdAt?.toDateString()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error listing users:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'cleanup') {
  cleanupTestData();
} else if (command === 'list' || command === 'users') {
  listUsers();
} else if (command === 'help' || command === '--help' || command === '-h') {
  console.log(`
🧪 Test Data Generator for TimeMachine

Usage:
  npm run generate-test-data [username] [count]
  npm run generate-test-data cleanup [username]
  npm run generate-test-data list
  npm run generate-test-data help

Arguments:
  username    Target username (default: admin)
  count       Number of test slices to generate (default: 200)

Examples:
  # List all users in database
  npm run generate-test-data list

  # Generate 200 test slices for user 'admin'
  npm run generate-test-data

  # Generate 500 test slices for user 'john'
  npm run generate-test-data john 500

  # Cleanup test data for user 'admin'
  npm run generate-test-data cleanup

  # Cleanup test data for user 'john'
  npm run generate-test-data cleanup john

Features:
  - Generates realistic test content with [test] prefix
  - Spreads data across the last year
  - Includes all slice types (work, fun, gym, reading, other)
  - Batch inserts for performance
  - Progress indicator
  - Summary report
  - Easy cleanup

Test Search Queries:
  - "[test]" - finds all test slices
  - "meeting" - tests infinite scroll
  - "project" - tests pagination
  - Use regex: "\\[test\\].*work" for advanced patterns
`);
  process.exit(0);
} else {
  generateTestData();
}