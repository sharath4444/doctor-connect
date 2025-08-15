const express = require('express');
const Doctor = require('../models/Doctor');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get current doctor's profile
router.get('/profile', async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.user._id).select('-password');
        
        if (!doctor) {
            return res.status(404).json({
                error: 'Doctor not found',
                message: 'Doctor profile not found'
            });
        }

        res.json({ doctor });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Failed to fetch profile',
            message: 'Internal server error'
        });
    }
});

// Update doctor's profile
router.put('/profile', async (req, res) => {
    try {
        const { name, phone, address, city, state } = req.body;
        
        const doctor = await Doctor.findById(req.user._id);
        if (!doctor) {
            return res.status(404).json({
                error: 'Doctor not found',
                message: 'Doctor profile not found'
            });
        }

        // Update fields
        if (name) doctor.name = name;
        if (phone) doctor.phone = phone;
        if (address) doctor.address = address;
        if (city) doctor.city = city;
        if (state) doctor.state = state;

        await doctor.save();

        res.json({
            message: 'Profile updated successfully',
            doctor: doctor.toPublicJSON()
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: 'Failed to update profile',
            message: 'Internal server error'
        });
    }
});

// Get doctor statistics
router.get('/stats/overview', async (req, res) => {
    try {
        // This would typically include enrollment and certificate statistics
        // For now, we'll return basic profile information
        const doctor = await Doctor.findById(req.user._id).select('-password');
        
        if (!doctor) {
            return res.status(404).json({
                error: 'Doctor not found',
                message: 'Doctor profile not found'
            });
        }

        res.json({
            stats: {
                name: doctor.name,
                specialization: doctor.specialization,
                experienceYears: doctor.experience_years,
                city: doctor.city,
                state: doctor.state,
                isVerified: doctor.isVerified,
                memberSince: doctor.createdAt
            }
        });

    } catch (error) {
        console.error('Get doctor stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch doctor statistics',
            message: 'Internal server error'
        });
    }
});

// Get all doctors (for admin purposes - you might want to add admin middleware)
router.get('/', async (req, res) => {
    try {
        const { specialization, city, state, limit = 20, page = 1 } = req.query;

        // Build query
        const query = {};
        if (specialization) query.specialization = specialization;
        if (city) query.city = new RegExp(city, 'i');
        if (state) query.state = new RegExp(state, 'i');

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const doctors = await Doctor.find(query)
            .select('-password')
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ name: 1 });

        const total = await Doctor.countDocuments(query);

        res.json({
            doctors,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                hasNext: skip + doctors.length < total,
                hasPrev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({
            error: 'Failed to fetch doctors',
            message: 'Internal server error'
        });
    }
});

// Get doctor by ID (public info only)
router.get('/:id', async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id)
            .select('name specialization experience_years city state isVerified')
            .lean();

        if (!doctor) {
            return res.status(404).json({
                error: 'Doctor not found',
                message: 'Doctor with this ID does not exist'
            });
        }

        res.json({ doctor });

    } catch (error) {
        console.error('Get doctor error:', error);
        res.status(500).json({
            error: 'Failed to fetch doctor',
            message: 'Internal server error'
        });
    }
});

// Get doctors by specialization
router.get('/specialization/:specialization', async (req, res) => {
    try {
        const { specialization } = req.params;
        const { limit = 10 } = req.query;

        const doctors = await Doctor.find({
            specialization: specialization
        })
        .select('name specialization experience_years city state isVerified')
        .limit(parseInt(limit))
        .sort({ name: 1 });

        res.json({ doctors });

    } catch (error) {
        console.error('Get doctors by specialization error:', error);
        res.status(500).json({
            error: 'Failed to fetch doctors',
            message: 'Internal server error'
        });
    }
});

// Get doctors by location
router.get('/location/:city', async (req, res) => {
    try {
        const { city } = req.params;
        const { limit = 10 } = req.query;

        const doctors = await Doctor.find({
            city: new RegExp(city, 'i')
        })
        .select('name specialization experience_years city state isVerified')
        .limit(parseInt(limit))
        .sort({ name: 1 });

        res.json({ doctors });

    } catch (error) {
        console.error('Get doctors by location error:', error);
        res.status(500).json({
            error: 'Failed to fetch doctors',
            message: 'Internal server error'
        });
    }
});

// Search doctors
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const { limit = 10 } = req.query;

        const doctors = await Doctor.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { specialization: { $regex: query, $options: 'i' } },
                { city: { $regex: query, $options: 'i' } },
                { state: { $regex: query, $options: 'i' } }
            ]
        })
        .select('name specialization experience_years city state isVerified')
        .limit(parseInt(limit))
        .sort({ name: 1 });

        res.json({ doctors });

    } catch (error) {
        console.error('Search doctors error:', error);
        res.status(500).json({
            error: 'Failed to search doctors',
            message: 'Internal server error'
        });
    }
});

// Get all specializations
router.get('/specializations/all', async (req, res) => {
    try {
        const specializations = await Doctor.distinct('specialization');
        res.json({ specializations: specializations.sort() });

    } catch (error) {
        console.error('Get specializations error:', error);
        res.status(500).json({
            error: 'Failed to fetch specializations',
            message: 'Internal server error'
        });
    }
});

// Get doctor statistics (admin view)
router.get('/stats/doctors', async (req, res) => {
    try {
        const totalDoctors = await Doctor.countDocuments();
        const verifiedDoctors = await Doctor.countDocuments({ isVerified: true });
        const unverifiedDoctors = await Doctor.countDocuments({ isVerified: false });
        
        const cities = await Doctor.distinct('city');
        const states = await Doctor.distinct('state');
        const specializations = await Doctor.distinct('specialization');

        // Get experience distribution
        const experienceStats = await Doctor.aggregate([
            {
                $group: {
                    _id: null,
                    avgExperience: { $avg: '$experience_years' },
                    minExperience: { $min: '$experience_years' },
                    maxExperience: { $max: '$experience_years' }
                }
            }
        ]);

        res.json({
            stats: {
                total: totalDoctors,
                verified: verifiedDoctors,
                unverified: unverifiedDoctors,
                cities: cities.length,
                states: states.length,
                specializations: specializations.length,
                experience: experienceStats[0] || {
                    avgExperience: 0,
                    minExperience: 0,
                    maxExperience: 0
                }
            }
        });

    } catch (error) {
        console.error('Get doctor stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch doctor statistics',
            message: 'Internal server error'
        });
    }
});

module.exports = router; 