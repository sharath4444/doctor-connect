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

// Test admin login
async function testAdminLogin() {
    try {
        const adminUser = await Doctor.findOne({ email: 'admin@doctorconnect.com' });
        
        if (!adminUser) {
            console.log('❌ Admin user not found');
            return;
        }

        console.log('✅ Admin user found');
        console.log('📧 Email:', adminUser.email);
        console.log('👤 Name:', adminUser.name);
        console.log('🔑 Role:', adminUser.role);
        console.log('🔐 Hashed Password:', adminUser.password.substring(0, 20) + '...');

        // Test password comparison
        const testPassword = 'admin123';
        const isValidPassword = await adminUser.comparePassword(testPassword);
        
        console.log('🔍 Testing password:', testPassword);
        console.log('✅ Password valid:', isValidPassword);

        if (isValidPassword) {
            console.log('🎉 Admin login should work!');
        } else {
            console.log('❌ Password comparison failed');
            
            // Let's try to recreate the admin with a fresh password
            console.log('🔄 Recreating admin user with fresh password...');
            
            // Delete existing admin
            await Doctor.deleteOne({ email: 'admin@doctorconnect.com' });
            
            // Create new admin
            const hashedPassword = await bcrypt.hash('admin123', 12);
            const newAdmin = new Doctor({
                name: 'System Administrator',
                email: 'admin@doctorconnect.com',
                password: hashedPassword,
                phone: '999-999-9999',
                specialization: 'General Medicine',
                license_number: 'ADMIN-00001-2024',
                experience_years: 10,
                address: 'System Administration Office',
                city: 'System City',
                state: 'System State',
                role: 'admin'
            });
            
            await newAdmin.save();
            console.log('✅ Admin user recreated successfully');
            
            // Test the new password
            const newAdminUser = await Doctor.findOne({ email: 'admin@doctorconnect.com' });
            const newPasswordValid = await newAdminUser.comparePassword('admin123');
            console.log('🔍 Testing new password: admin123');
            console.log('✅ New password valid:', newPasswordValid);
        }

    } catch (error) {
        console.error('❌ Error testing admin login:', error);
    }
}

// Run the test
async function main() {
    await connectDB();
    await testAdminLogin();
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
}

main();
