const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    enrollment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enrollment',
        required: [true, 'Enrollment ID is required']
    },
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
    certificate_number: {
        type: String,
        required: [true, 'Certificate number is required'],
        unique: true,
        trim: true,
        index: true
    },
    issue_date: {
        type: Date,
        required: [true, 'Issue date is required'],
        default: Date.now
    },
    service_period: {
        type: String,
        required: [true, 'Service period is required'],
        trim: true
    },
    total_hours: {
        type: Number,
        required: [true, 'Total hours is required'],
        min: [1, 'Total hours must be at least 1']
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
    file_path: {
        type: String,
        required: [true, 'File path is required'],
        trim: true
    },
    file_size: {
        type: Number,
        default: 0
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verification_date: {
        type: Date,
        default: null
    },
    verified_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        default: null
    },
    additional_notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Additional notes cannot exceed 500 characters']
    }
}, {
    timestamps: true
});

// Index for efficient queries
certificateSchema.index({ doctor_id: 1, issue_date: -1 });
certificateSchema.index({ enrollment_id: 1 });

// Virtual for formatted issue date
certificateSchema.virtual('formattedIssueDate').get(function() {
    return this.issue_date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// Virtual for certificate status
certificateSchema.virtual('status').get(function() {
    if (this.isVerified) {
        return 'Verified';
    }
    return 'Pending Verification';
});

// Method to generate certificate number
certificateSchema.statics.generateCertificateNumber = function() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `CERT-${timestamp}-${random}`.toUpperCase();
};

// Method to get certificates by doctor
certificateSchema.statics.getByDoctor = function(doctorId) {
    return this.find({ doctor_id: doctorId })
        .populate('enrollment_id')
        .populate('hospital_id', 'name city state')
        .sort({ issue_date: -1 });
};

// Method to get certificates by hospital
certificateSchema.statics.getByHospital = function(hospitalId) {
    return this.find({ hospital_id: hospitalId })
        .populate('doctor_id', 'name specialization')
        .populate('enrollment_id')
        .sort({ issue_date: -1 });
};

// Method to verify certificate
certificateSchema.methods.verify = function(verifiedBy) {
    this.isVerified = true;
    this.verification_date = new Date();
    this.verified_by = verifiedBy;
    return this.save();
};

module.exports = mongoose.model('Certificate', certificateSchema); 