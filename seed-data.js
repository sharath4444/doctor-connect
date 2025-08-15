const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load scraped hospitals from hospitals_tel.json
function loadScrapedHospitals() {
    try {
        const jsonPath = path.join(__dirname, 'hospitals_tel.json');
        if (!fs.existsSync(jsonPath)) {
            console.log('ℹ️  No hospitals_tel.json found. Please run the scraper first.');
            return [];
        }
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            console.log('⚠️  hospitals_tel.json is not an array. Please check the file format.');
            return [];
        }
        console.log(`📥 Loaded ${parsed.length} scraped hospitals from hospitals_tel.json`);
        return parsed;
    } catch (err) {
        console.log('⚠️  Failed to read hospitals_tel.json:', err.message);
        return [];
    }
}

// Connect to MongoDB Atlas
async function connectDB() {
    try {
        // MongoDB Atlas connection string
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

// Seed hospitals data
async function seedHospitals() {
    try {
        const hospitals = loadScrapedHospitals();
        
        if (hospitals.length === 0) {
            console.log('❌ No hospitals to seed. Please run the scraper first: node scrape-telangana.js');
            return;
        }

        // Clear existing hospitals to avoid duplicates
        await Hospital.deleteMany({});
        console.log('🗑️  Cleared existing hospitals');

        // Insert scraped hospitals
        const insertedHospitals = await Hospital.insertMany(hospitals);
        console.log(`✅ Seeded ${insertedHospitals.length} hospitals from hospitals_tel.json`);

        // Display seeded hospitals
        console.log('\n📋 Seeded Hospitals:');
        insertedHospitals.forEach((hospital, index) => {
            console.log(`${index + 1}. ${hospital.name} - ${hospital.city}, ${hospital.state}`);
        });

    } catch (error) {
        console.error('❌ Error seeding hospitals:', error);
    }
}

// Main function
async function main() {
    await connectDB();
    await seedHospitals();
    
    console.log('\n🎉 Database seeding completed!');
    process.exit(0);
}

// Run the seeding
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { seedHospitals }; 