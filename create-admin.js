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

// Create admin user
async function createAdminUser() {
    try {
        // Check if admin already exists
        const existingAdmin = await Doctor.findOne({ email: 'admin@doctorconnect.com' });
        
        if (existingAdmin) {
            console.log('⚠️  Admin user already exists!');
            console.log('Email: admin@doctorconnect.com');
            console.log('Password: admin123');
            return;
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('admin123', saltRounds);

        // Create admin user
        const adminUser = new Doctor({
            name: 'System Administrator',
            email: 'admin@doctorconnect.com',
            password: hashedPassword,
            phone: '999-999-9999',
            specialization: 'General Medicine', // Using valid specialization
            license_number: 'ADMIN-00001-2024',
            experience_years: 10,
            address: 'System Administration Office',
            city: 'System City',
            state: 'System State',
            role: 'admin' // This is the key field for admin privileges
        });

        await adminUser.save();
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@doctorconnect.com');
        console.log('🔑 Password: admin123');
        console.log('👤 Role: admin');

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    }
}

// Main function
async function main() {
    await connectDB();
    await createAdminUser();
    
    console.log('\n🎉 Admin user setup completed!');
    console.log('\n💡 You can now login with these credentials:');
    console.log('   Email: admin@doctorconnect.com');
    console.log('   Password: admin123');
    console.log('\n🔐 After login, you will see admin controls in the Enrollment Management section.');
    
    process.exit(0);
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { createAdminUser };
