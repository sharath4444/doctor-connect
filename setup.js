const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Doctor Connect - Setup Script');
console.log('================================\n');

// Check if Node.js is installed
try {
    const nodeVersion = process.version;
    console.log(`✅ Node.js version: ${nodeVersion}`);
} catch (error) {
    console.error('❌ Node.js is not installed. Please install Node.js v14 or higher.');
    process.exit(1);
}

// Check if npm is available
try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✅ npm version: ${npmVersion}`);
} catch (error) {
    console.error('❌ npm is not available. Please install npm.');
    process.exit(1);
}

// Check if MongoDB is running
async function checkMongoDB() {
    try {
        const { MongoClient } = require('mongodb');
        const client = new MongoClient('mongodb://localhost:27017', { 
            serverSelectionTimeoutMS: 5000 
        });
        await client.connect();
        await client.db('admin').command({ ping: 1 });
        await client.close();
        console.log('✅ MongoDB is running');
        return true;
    } catch (error) {
        console.log('⚠️  MongoDB is not running. Please start MongoDB before continuing.');
        console.log('   You can start MongoDB with: mongod');
        return false;
    }
}

// Create .env file if it doesn't exist
function createEnvFile() {
    const envPath = path.join(__dirname, '.env');
    const envExamplePath = path.join(__dirname, 'env.example');
    
    if (!fs.existsSync(envPath)) {
        if (fs.existsSync(envExamplePath)) {
            fs.copyFileSync(envExamplePath, envPath);
            console.log('✅ Created .env file from env.example');
        } else {
            // Create basic .env file
            const envContent = `# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/doctor-connect

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3000
NODE_ENV=development

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
`;
            fs.writeFileSync(envPath, envContent);
            console.log('✅ Created .env file with default configuration');
        }
    } else {
        console.log('✅ .env file already exists');
    }
}

// Install dependencies
function installDependencies() {
    try {
        console.log('\n📦 Installing dependencies...');
        execSync('npm install', { stdio: 'inherit' });
        console.log('✅ Dependencies installed successfully');
    } catch (error) {
        console.error('❌ Failed to install dependencies');
        process.exit(1);
    }
}

// Seed database
async function seedDatabase() {
    try {
        console.log('\n🌱 Seeding database with sample hospitals...');
        execSync('node seed-data.js', { stdio: 'inherit' });
        console.log('✅ Database seeded successfully');
    } catch (error) {
        console.error('❌ Failed to seed database');
        console.log('   Make sure MongoDB is running and try again');
    }
}

// Main setup function
async function setup() {
    console.log('🔧 Starting setup process...\n');
    
    // Create .env file
    createEnvFile();
    
    // Install dependencies
    installDependencies();
    
    // Check MongoDB
    const mongoRunning = await checkMongoDB();
    
    if (mongoRunning) {
        // Seed database
        await seedDatabase();
        
        console.log('\n🎉 Setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Start the application: npm run dev');
        console.log('2. Open your browser: http://localhost:3000');
        console.log('3. Register as a doctor and start exploring!');
    } else {
        console.log('\n⚠️  Setup partially completed.');
        console.log('\n📋 To complete setup:');
        console.log('1. Start MongoDB: mongod');
        console.log('2. Run: node seed-data.js');
        console.log('3. Start the application: npm run dev');
    }
    
    console.log('\n📚 For more information, see README.md');
}

// Run setup
setup().catch(console.error); 