const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
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

// Check admin user
async function checkAdminUser() {
    try {
        const adminUser = await Doctor.findOne({ email: 'admin@doctorconnect.com' });
        
        if (adminUser) {
            console.log('✅ Admin user found!');
            console.log('📧 Email:', adminUser.email);
            console.log('👤 Name:', adminUser.name);
            console.log('🔑 Role:', adminUser.role);
            console.log('📅 Created:', adminUser.createdAt);
            console.log('🆔 ID:', adminUser._id);
        } else {
            console.log('❌ Admin user not found!');
            console.log('💡 Run: node create-admin.js to create admin user');
        }

        // Also check all users
        const allUsers = await Doctor.find({}, 'name email role createdAt');
        console.log('\n📋 All users in database:');
        allUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
        });

    } catch (error) {
        console.error('❌ Error checking admin user:', error);
    }
}

// Main function
async function main() {
    await connectDB();
    await checkAdminUser();
    process.exit(0);
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { checkAdminUser };
