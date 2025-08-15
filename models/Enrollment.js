const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    doctor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: [true, 'Doctor ID is required']
    },
    hospital_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: [true, 'Hospital ID is required']
    },
    start_date: {
        type: Date,
        required: [true, 'Start date is required'],
        validate: {
            validator: function(value) {
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Set to start of today
                return value >= today;
            },
            message: 'Start date must be today or in the future'
        }
    },
    end_date: {
        type: Date,
        required: [true, 'End date is required'],
        validate: {
            validator: function(value) {
                return value > this.start_date;
            },
            message: 'End date must be after start date'
        }
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    service_hours: {
        type: Number,
        required: [true, 'Service hours is required'],
        min: [1, 'Service hours must be at least 1'],
        max: [40, 'Service hours cannot exceed 40 per week']
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
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
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    admin_notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Admin notes cannot exceed 500 characters']
    },
    total_hours_completed: {
        type: Number,
        default: 0,
        min: [0, 'Total hours cannot be negative']
    },
    completion_date: {
        type: Date,
        default: null
    },
    certificate_generated: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for efficient queries
enrollmentSchema.index({ doctor_id: 1, status: 1 });
enrollmentSchema.index({ hospital_id: 1, status: 1 });
enrollmentSchema.index({ status: 1, start_date: 1 });

// Virtual for service period
enrollmentSchema.virtual('servicePeriod').get(function() {
    if (this.start_date && this.end_date) {
        const start = this.start_date.toLocaleDateString();
        const end = this.end_date.toLocaleDateString();
        return `${start} - ${end}`;
    }
    return 'Not set';
});

// Virtual for duration in days
enrollmentSchema.virtual('durationDays').get(function() {
    if (this.start_date && this.end_date) {
        const diffTime = Math.abs(this.end_date - this.start_date);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
});

// Method to check if enrollment is active
enrollmentSchema.methods.isActive = function() {
    const now = new Date();
    return this.status === 'approved' && 
           this.start_date <= now && 
           this.end_date >= now;
};

// Method to check if enrollment is completed
enrollmentSchema.methods.isCompleted = function() {
    return this.status === 'completed' || 
           (this.end_date < new Date() && this.status === 'approved');
};

// Static method to get active enrollments
enrollmentSchema.statics.getActiveEnrollments = function() {
    const now = new Date();
    return this.find({
        status: 'approved',
        start_date: { $lte: now },
        end_date: { $gte: now }
    }).populate('doctor_id', 'name email specialization')
      .populate('hospital_id', 'name city state');
};

// Static method to get enrollments by status
enrollmentSchema.statics.getByStatus = function(status) {
    return this.find({ status })
        .populate('doctor_id', 'name email specialization')
        .populate('hospital_id', 'name city state');
};

module.exports = mongoose.model('Enrollment', enrollmentSchema); 