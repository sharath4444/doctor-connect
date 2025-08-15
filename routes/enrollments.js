const express = require('express');
const { body, validationResult } = require('express-validator');
const Enrollment = require('../models/Enrollment');
const Hospital = require('../models/Hospital');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation rules
const enrollmentValidation = [
    body('hospital_id')
        .isMongoId()
        .withMessage('Valid hospital ID is required'),
    body('start_date')
        .isISO8601()
        .withMessage('Valid start date is required'),
    body('end_date')
        .isISO8601()
        .withMessage('Valid end date is required'),
    body('service_hours')
        .isInt({ min: 1, max: 40 })
        .withMessage('Service hours must be between 1 and 40 per week'),
    body('department')
        .isIn([
            'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
            'Oncology', 'Psychiatry', 'General Medicine', 'Surgery',
            'Emergency Medicine', 'Radiology', 'Anesthesiology', 'Dermatology',
            'Gynecology', 'Ophthalmology', 'ENT', 'Urology'
        ])
        .withMessage('Please select a valid department'),
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
];

// Create new enrollment
router.post('/', enrollmentValidation, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            hospital_id,
            start_date,
            end_date,
            service_hours,
            department,
            notes
        } = req.body;

        // Check if hospital exists
        const hospital = await Hospital.findById(hospital_id);
        if (!hospital) {
            return res.status(404).json({
                error: 'Hospital not found',
                message: 'Hospital with this ID does not exist'
            });
        }

        // Check if hospital has the requested department
        if (!hospital.specialties.includes(department)) {
            return res.status(400).json({
                error: 'Department not available',
                message: 'This hospital does not have the requested department'
            });
        }

        // Check for overlapping enrollments
        const overlappingEnrollment = await Enrollment.findOne({
            doctor_id: req.user._id,
            hospital_id,
            status: { $in: ['pending', 'approved'] },
            $or: [
                {
                    start_date: { $lte: new Date(end_date) },
                    end_date: { $gte: new Date(start_date) }
                }
            ]
        });

        if (overlappingEnrollment) {
            return res.status(400).json({
                error: 'Overlapping enrollment',
                message: 'You already have an enrollment that overlaps with this period'
            });
        }

        // Create enrollment
        const enrollment = new Enrollment({
            doctor_id: req.user._id,
            hospital_id,
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            service_hours,
            department,
            notes
        });

        await enrollment.save();

        // Populate hospital details for response
        await enrollment.populate('hospital_id', 'name city state');

        res.status(201).json({
            message: 'Enrollment submitted successfully',
            enrollment
        });

    } catch (error) {
        console.error('Create enrollment error:', error);
        res.status(500).json({
            error: 'Failed to create enrollment',
            message: 'Internal server error'
        });
    }
});

// Get all enrollments for the logged-in doctor
router.get('/', async (req, res) => {
    try {
        const { status, limit = 10, page = 1 } = req.query;

        // Build query
        const query = { doctor_id: req.user._id };
        if (status) query.status = status;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const enrollments = await Enrollment.find(query)
            .populate('hospital_id', 'name city state phone email')
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 });

        const total = await Enrollment.countDocuments(query);

        res.json({
            enrollments,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                hasNext: skip + enrollments.length < total,
                hasPrev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Get enrollments error:', error);
        res.status(500).json({
            error: 'Failed to fetch enrollments',
            message: 'Internal server error'
        });
    }
});

// Get enrollment by ID
router.get('/:id', async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({
            _id: req.params.id,
            doctor_id: req.user._id
        }).populate('hospital_id', 'name city state phone email address');

        if (!enrollment) {
            return res.status(404).json({
                error: 'Enrollment not found',
                message: 'Enrollment with this ID does not exist'
            });
        }

        res.json({ enrollment });

    } catch (error) {
        console.error('Get enrollment error:', error);
        res.status(500).json({
            error: 'Failed to fetch enrollment',
            message: 'Internal server error'
        });
    }
});

// Update enrollment
router.put('/:id', [
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                errors: errors.array()
            });
        }

        const enrollment = await Enrollment.findOne({
            _id: req.params.id,
            doctor_id: req.user._id
        });

        if (!enrollment) {
            return res.status(404).json({
                error: 'Enrollment not found',
                message: 'Enrollment with this ID does not exist'
            });
        }

        // Only allow updates if enrollment is pending
        if (enrollment.status !== 'pending') {
            return res.status(400).json({
                error: 'Cannot update enrollment',
                message: 'Only pending enrollments can be updated'
            });
        }

        // Update fields
        if (req.body.notes !== undefined) {
            enrollment.notes = req.body.notes;
        }

        await enrollment.save();

        res.json({
            message: 'Enrollment updated successfully',
            enrollment
        });

    } catch (error) {
        console.error('Update enrollment error:', error);
        res.status(500).json({
            error: 'Failed to update enrollment',
            message: 'Internal server error'
        });
    }
});

// Cancel enrollment
router.delete('/:id', async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({
            _id: req.params.id,
            doctor_id: req.user._id
        });

        if (!enrollment) {
            return res.status(404).json({
                error: 'Enrollment not found',
                message: 'Enrollment with this ID does not exist'
            });
        }

        // Only allow cancellation if enrollment is pending
        if (enrollment.status !== 'pending') {
            return res.status(400).json({
                error: 'Cannot cancel enrollment',
                message: 'Only pending enrollments can be cancelled'
            });
        }

        enrollment.status = 'cancelled';
        await enrollment.save();

        res.json({
            message: 'Enrollment cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel enrollment error:', error);
        res.status(500).json({
            error: 'Failed to cancel enrollment',
            message: 'Internal server error'
        });
    }
});

// Get enrollment statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const totalEnrollments = await Enrollment.countDocuments({ doctor_id: req.user._id });
        const pendingEnrollments = await Enrollment.countDocuments({ 
            doctor_id: req.user._id, 
            status: 'pending' 
        });
        const approvedEnrollments = await Enrollment.countDocuments({ 
            doctor_id: req.user._id, 
            status: 'approved' 
        });
        const completedEnrollments = await Enrollment.countDocuments({ 
            doctor_id: req.user._id, 
            status: 'completed' 
        });
        const rejectedEnrollments = await Enrollment.countDocuments({ 
            doctor_id: req.user._id, 
            status: 'rejected' 
        });

        // Calculate total hours served
        const completedEnrollmentsData = await Enrollment.find({
            doctor_id: req.user._id,
            status: 'completed'
        });

        const totalHoursServed = completedEnrollmentsData.reduce((total, enrollment) => {
            return total + (enrollment.total_hours_completed || 0);
        }, 0);

        res.json({
            stats: {
                total: totalEnrollments,
                pending: pendingEnrollments,
                approved: approvedEnrollments,
                completed: completedEnrollments,
                rejected: rejectedEnrollments,
                totalHoursServed
            }
        });

    } catch (error) {
        console.error('Get enrollment stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch enrollment statistics',
            message: 'Internal server error'
        });
    }
});

// Get active enrollments
router.get('/active/current', async (req, res) => {
    try {
        const now = new Date();
        const activeEnrollments = await Enrollment.find({
            doctor_id: req.user._id,
            status: 'approved',
            start_date: { $lte: now },
            end_date: { $gte: now }
        }).populate('hospital_id', 'name city state');

        res.json({ enrollments: activeEnrollments });

    } catch (error) {
        console.error('Get active enrollments error:', error);
        res.status(500).json({
            error: 'Failed to fetch active enrollments',
            message: 'Internal server error'
        });
    }
});

module.exports = router; 