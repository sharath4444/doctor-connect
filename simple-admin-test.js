const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB Atlas
async function connectDB() {
    try {
        const mongoURI = 'mongodb+srv://sharath444:Sharath123@cluster0.1u734pi.mongodb.net/doctor-connect?retryWrites=true&w=majority&appName=Cluster0';
        
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 10000,
            maxPoolSize: 10,
            autoIndex: true
        });
        console.log('✅ Connected to MongoDB Atlas');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// Test password hashing
async function testPasswordHashing() {
    try {
        const plainPassword = 'admin123';
        console.log('🔍 Testing password:', plainPassword);
        
        // Hash password manually
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);
        console.log('🔐 Manually hashed password:', hashedPassword);
        
        // Test comparison
        const isValid = await bcrypt.compare(plainPassword, hashedPassword);
        console.log('✅ Manual comparison result:', isValid);
        
        // Now test with the Doctor model
        console.log('\n🔄 Testing with Doctor model...');
        
        // Delete existing admin
        await Doctor.deleteOne({ email: 'admin@doctorconnect.com' });
        
        // Create admin without pre-save hook (to avoid double hashing)
        const adminData = {
            name: 'System Administrator',
            email: 'admin@doctorconnect.com',
            password: hashedPassword, // Use the already hashed password
            phone: '999-999-9999',
            specialization: 'General Medicine',
            license_number: 'ADMIN-00001-2024',
            experience_years: 10,
            address: 'System Administration Office',
            city: 'System City',
            state: 'System State',
            role: 'admin'
        };
        
        // Create admin using insertOne to bypass pre-save hook
        await mongoose.connection.collection('doctors').insertOne(adminData);
        console.log('✅ Admin created with pre-hashed password');
        
        // Find and test
        const adminUser = await Doctor.findOne({ email: 'admin@doctorconnect.com' });
        console.log('🔐 Stored password:', adminUser.password);
        
        const modelComparison = await adminUser.comparePassword(plainPassword);
        console.log('✅ Model comparison result:', modelComparison);
        
        // Also test direct bcrypt comparison
        const directComparison = await bcrypt.compare(plainPassword, adminUser.password);
        console.log('✅ Direct bcrypt comparison:', directComparison);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the test
async function main() {
    await connectDB();
    await testPasswordHashing();
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
}

main();
