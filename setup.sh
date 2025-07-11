#!/bin/bash

echo "🚀 Setting up TimeMachine v2.0..."

# Check Node.js version
NODE_VERSION=$(node --version)
echo "📦 Node.js version: $NODE_VERSION"

# Check if we have the right Node.js version
if ! node -e "process.exit(process.version.match(/^v(\d+)/)[1] >= 18 ? 0 : 1)"; then
    echo "❌ Node.js 18+ is required. Please upgrade Node.js"
    exit 1
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "🔧 Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
echo "🎨 Installing client dependencies..."
cd client
npm install
cd ..

# Copy environment files
echo "⚙️ Setting up environment files..."
if [ ! -f server/.env ]; then
    cp server/.env.example server/.env
    echo "✅ Created server/.env from example"
fi

if [ ! -f client/.env ]; then
    cp client/.env.example client/.env
    echo "✅ Created client/.env from example"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Edit server/.env with your MongoDB connection details"
echo "2. Start development: npm run dev"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "💡 Commands:"
echo "  npm run dev       - Start development servers"
echo "  npm run build     - Build for production"
echo "  npm run start     - Start production server"
echo "  npm run lint      - Run linting"
echo "  npm run test      - Run tests"
echo ""