const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Hospital name is required'],
        trim: true
    },
    type: {
        type: String,
        required: [true, 'Hospital type is required'],
        enum: ['government', 'private'],
        default: 'government'
    },
    address: {
        type: String,
        required: false,
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
    capacity: {
        type: Number,
        required: false,
        min: [0, 'Capacity must be at least 0']
    },
    specialties: [{
        type: String,
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
            'Dermatology',
            'Gynecology',
            'Ophthalmology',
            'ENT',
            'Urology'
        ]
    }],
    facilities: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

// Method to get hospitals by specialization
hospitalSchema.statics.findBySpecialization = function(specialization) {
    return this.find({
        specialties: specialization
    });
};

module.exports = mongoose.model('Hospital', hospitalSchema); 