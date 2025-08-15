const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    specialization: {
        type: String,
        required: [true, 'Specialization is required'],
        enum: [
            'Cardiology',
            'Neurology',
            'Orthopedics',
            'Pediatrics',
            'Oncology',
            'Psychiatry',
            'General Medicine',
            'Surgery',
            'Emergency Medicine',
            'Radiology',
            'Anesthesiology',
            'Dermatology'
        ]
    },
    license_number: {
        type: String,
        required: [true, 'License number is required'],
        unique: true,
        trim: true
    },
    experience_years: {
        type: Number,
        required: [true, 'Experience years is required'],
        min: [0, 'Experience years cannot be negative']
    },
    address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true
    },
    city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
    },
    state: {
        type: String,
        required: [true, 'State is required'],
        trim: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ['doctor', 'admin'],
        default: 'doctor'
    },
    profileImage: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Hash password before saving
doctorSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
doctorSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without password)
doctorSchema.methods.toPublicJSON = function() {
    const doctor = this.toObject();
    delete doctor.password;
    return doctor;
};

module.exports = mongoose.model('Doctor', doctorSchema); 