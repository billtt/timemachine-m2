# Test Data Generator

A script to generate realistic test data for testing the infinite scrolling feature and search functionality.

## Quick Start

```bash
# Navigate to server directory
cd server

# Generate 200 test slices for default user
npm run generate-test-data

# Generate 500 test slices for specific user
npm run generate-test-data john 500

# Clean up test data
npm run generate-test-data cleanup
```

## Features

### 📝 **Realistic Content**
- 50+ different activity templates
- Categories: work, personal, learning, health, hobbies
- Random suffixes for uniqueness
- All content prefixed with `[test]` for easy identification

### 📅 **Time Distribution**
- Spreads data across the last year
- Random dates and times
- Chronologically sorted insertion

### 🎯 **Slice Types**
- Balanced distribution across all types
- `work`, `fun`, `gym`, `reading`, `other`
- Realistic activity-to-type matching

### ⚡ **Performance**
- Batch inserts (50 slices per batch)
- Progress indicator
- Optimized for large datasets

## Usage Examples

### Basic Usage
```bash
# Generate 200 test slices for 'admin' user
npm run generate-test-data

# Generate 100 test slices for 'john' user
npm run generate-test-data john 100

# Generate 1000 test slices for stress testing
npm run generate-test-data admin 1000
```

### Cleanup
```bash
# Clean up test data for 'admin' user
npm run generate-test-data cleanup

# Clean up test data for 'john' user
npm run generate-test-data cleanup john
```

### Help
```bash
# Show help and usage information
npm run generate-test-data help
```

## Sample Output

```
🚀 Starting test data generation...
✅ Connected to database
👤 Target user: admin
📊 Generating 200 test slices...
✅ Found user: admin (admin@example.com)
📝 Inserted 200/200 slices (100%)
✅ Test data generation completed!

📊 Test data summary:
  work: 45 slices
  fun: 42 slices
  other: 38 slices
  gym: 36 slices
  reading: 39 slices

📅 Date range:
  From: 2024-07-20
  To: 2025-07-18

🎯 Testing suggestions:
  - Search for "[test]" to find all test slices
  - Search for "meeting" to test infinite scroll
  - Search for "project" to test pagination
  - Use regex search with "\\[test\\].*work" pattern
```

## Testing Infinite Scroll

### 1. **Generate Test Data**
```bash
# Generate enough data for multiple pages
npm run generate-test-data admin 300
```

### 2. **Test Search Queries**
```bash
# Common terms that should return 100+ results
Search: "[test]"          # All test slices
Search: "meeting"         # Work-related activities
Search: "project"         # Development activities
Search: "work"            # Work-type activities
Search: "run"             # Fitness activities
```

### 3. **Test Infinite Scroll**
- Search for `[test]` or `meeting`
- Scroll to bottom of first 50 results
- Should automatically load next 50
- Continue until all results loaded

### 4. **Test Manual Load More**
- If auto-scroll doesn't work, "Load More" button should appear
- Click to load next page
- Should work as fallback

## Sample Test Content

The generator creates realistic activities like:
- `[test] attended daily standup meeting a7x2k9`
- `[test] went for a morning run in the park b3m1p5`
- `[test] worked on project documentation c9w4r8`
- `[test] read chapter of new book d2s6t1`
- `[test] completed 45-minute yoga session e8h3q7`

## Data Structure

Each test slice includes:
```typescript
{
  content: "[test] attended daily standup meeting a7x2k9",
  type: "work",
  time: "2024-11-15T09:30:00.000Z",
  user: "admin",
  createdAt: "2025-07-18T10:00:00.000Z",
  updatedAt: "2025-07-18T10:00:00.000Z"
}
```

## Performance Testing

### Small Dataset (Testing)
```bash
npm run generate-test-data admin 50
```

### Medium Dataset (Development)
```bash
npm run generate-test-data admin 200
```

### Large Dataset (Stress Testing)
```bash
npm run generate-test-data admin 1000
```

## Cleanup

### Remove All Test Data
```bash
npm run generate-test-data cleanup admin
```

### Selective Cleanup
```bash
# In MongoDB shell or admin tool
db.slices.deleteMany({ content: /^\[test\]/ })
```

## Troubleshooting

### User Not Found
```
❌ User 'john' not found
Available users:
  - admin (admin@example.com)
  - test (test@example.com)
```
**Solution**: Use an existing username or create the user first.

### Database Connection Error
```
❌ Error generating test data: MongoError: connection refused
```
**Solution**: Ensure MongoDB is running and connection string is correct.

### Permission Error
```
❌ Error generating test data: MongoError: not authorized
```
**Solution**: Check database user permissions and authentication.

## Integration with Tests

### Unit Tests
```typescript
beforeEach(async () => {
  // Generate test data for each test
  await generateTestSlices(50);
});

afterEach(async () => {
  // Clean up test data
  await Slice.deleteMany({ content: /^\[test\]/ });
});
```

### E2E Tests
```typescript
describe('Infinite Scroll', () => {
  beforeAll(async () => {
    // Generate large dataset for E2E testing
    await generateTestSlices(300);
  });

  it('should load more results on scroll', async () => {
    // Test infinite scroll behavior
  });
});
```

## Configuration

### Modify Activities
Edit `testActivities` array in `generateTestData.ts` to customize content.

### Adjust Date Range
Modify `generateRandomDate()` function to change time distribution.

### Change Batch Size
Adjust `batchSize` variable to optimize insertion performance.

## Security Notes

- All test data is prefixed with `[test]` for easy identification
- Cleanup function only removes test data, not real user data
- No sensitive information is generated
- Safe to run in development and testing environments