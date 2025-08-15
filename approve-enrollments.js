const mongoose = require('mongoose');
const Enrollment = require('./models/Enrollment');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/doctor-connect', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// Function to list all pending enrollments
async function listPendingEnrollments() {
    try {
        const enrollments = await Enrollment.find({ status: 'pending' })
            .populate('doctor_id', 'name email specialization')
            .populate('hospital_id', 'name city state');

        console.log('\n📋 Pending Enrollments:');
        console.log('========================');
        
        if (enrollments.length === 0) {
            console.log('No pending enrollments found.');
            return [];
        }

        enrollments.forEach((enrollment, index) => {
            console.log(`\n${index + 1}. Enrollment ID: ${enrollment._id}`);
            console.log(`   Doctor: ${enrollment.doctor_id.name} (${enrollment.doctor_id.specialization})`);
            console.log(`   Hospital: ${enrollment.hospital_id.name}, ${enrollment.hospital_id.city}`);
            console.log(`   Department: ${enrollment.department}`);
            console.log(`   Period: ${enrollment.start_date.toLocaleDateString()} - ${enrollment.end_date.toLocaleDateString()}`);
            console.log(`   Hours: ${enrollment.service_hours} per week`);
            console.log(`   Status: ${enrollment.status}`);
        });

        return enrollments;
    } catch (error) {
        console.error('❌ Error listing enrollments:', error);
        return [];
    }
}

// Function to approve a specific enrollment
async function approveEnrollment(enrollmentId) {
    try {
        const enrollment = await Enrollment.findByIdAndUpdate(
            enrollmentId,
            { 
                status: 'approved',
                updatedAt: new Date()
            },
            { new: true }
        ).populate('doctor_id', 'name email specialization')
         .populate('hospital_id', 'name city state');

        if (!enrollment) {
            console.log('❌ Enrollment not found');
            return false;
        }

        console.log('\n✅ Enrollment Approved Successfully!');
        console.log('====================================');
        console.log(`Doctor: ${enrollment.doctor_id.name}`);
        console.log(`Hospital: ${enrollment.hospital_id.name}`);
        console.log(`Department: ${enrollment.department}`);
        console.log(`Status: ${enrollment.status}`);
        console.log(`Updated: ${enrollment.updatedAt.toLocaleString()}`);

        return true;
    } catch (error) {
        console.error('❌ Error approving enrollment:', error);
        return false;
    }
}

// Function to approve all pending enrollments
async function approveAllPending() {
    try {
        const result = await Enrollment.updateMany(
            { status: 'pending' },
            { 
                status: 'approved',
                updatedAt: new Date()
            }
        );

        console.log(`\n✅ Approved ${result.modifiedCount} enrollments`);
        return result.modifiedCount;
    } catch (error) {
        console.error('❌ Error approving all enrollments:', error);
        return 0;
    }
}

// Function to change enrollment status
async function changeEnrollmentStatus(enrollmentId, newStatus) {
    const validStatuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(newStatus)) {
        console.log('❌ Invalid status. Valid statuses are:', validStatuses.join(', '));
        return false;
    }

    try {
        const enrollment = await Enrollment.findByIdAndUpdate(
            enrollmentId,
            { 
                status: newStatus,
                updatedAt: new Date()
            },
            { new: true }
        ).populate('doctor_id', 'name email specialization')
         .populate('hospital_id', 'name city state');

        if (!enrollment) {
            console.log('❌ Enrollment not found');
            return false;
        }

        console.log(`\n✅ Enrollment status changed to: ${newStatus.toUpperCase()}`);
        console.log('================================================');
        console.log(`Doctor: ${enrollment.doctor_id.name}`);
        console.log(`Hospital: ${enrollment.hospital_id.name}`);
        console.log(`Department: ${enrollment.department}`);
        console.log(`Status: ${enrollment.status}`);
        console.log(`Updated: ${enrollment.updatedAt.toLocaleString()}`);

        return true;
    } catch (error) {
        console.error('❌ Error changing enrollment status:', error);
        return false;
    }
}

// Main function
async function main() {
    await connectDB();

    console.log('\n🎯 Enrollment Management Tool');
    console.log('============================');
    console.log('1. List all pending enrollments');
    console.log('2. Approve specific enrollment');
    console.log('3. Approve all pending enrollments');
    console.log('4. Change enrollment status');
    console.log('5. Exit');

    // For demonstration, let's list pending enrollments first
    const pendingEnrollments = await listPendingEnrollments();

    if (pendingEnrollments.length > 0) {
        console.log('\n💡 To approve a specific enrollment, use:');
        console.log('node approve-enrollments.js approve <enrollment_id>');
        console.log('\n💡 To approve all pending enrollments, use:');
        console.log('node approve-enrollments.js approve-all');
        console.log('\n💡 To change status, use:');
        console.log('node approve-enrollments.js status <enrollment_id> <new_status>');
    }

    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        const command = args[0];
        
        switch (command) {
            case 'approve':
                if (args[1]) {
                    await approveEnrollment(args[1]);
                } else {
                    console.log('❌ Please provide enrollment ID');
                }
                break;
                
            case 'approve-all':
                await approveAllPending();
                break;
                
            case 'status':
                if (args[1] && args[2]) {
                    await changeEnrollmentStatus(args[1], args[2]);
                } else {
                    console.log('❌ Please provide enrollment ID and new status');
                }
                break;
                
            default:
                console.log('❌ Unknown command');
        }
    }

    process.exit(0);
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    listPendingEnrollments,
    approveEnrollment,
    approveAllPending,
    changeEnrollmentStatus
};
