const express = require('express');
const { body, validationResult } = require('express-validator');
const Doctor = require('../models/Doctor');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('phone')
        .trim()
        .isLength({ min: 10, max: 15 })
        .withMessage('Please provide a valid phone number'),
    body('specialization')
        .isIn([
            'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
            'Oncology', 'Psychiatry', 'General Medicine', 'Surgery',
            'Emergency Medicine', 'Radiology', 'Anesthesiology', 'Dermatology'
        ])
        .withMessage('Please select a valid specialization'),
    body('license_number')
        .trim()
        .isLength({ min: 5, max: 20 })
        .withMessage('License number must be between 5 and 20 characters'),
    body('experience_years')
        .isInt({ min: 0, max: 50 })
        .withMessage('Experience years must be between 0 and 50'),
    body('address')
        .trim()
        .isLength({ min: 10, max: 200 })
        .withMessage('Address must be between 10 and 200 characters'),
    body('city')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('City must be between 2 and 50 characters'),
    body('state')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('State must be between 2 and 50 characters')
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// Register doctor
router.post('/register', registerValidation, async (req, res) => {
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
            name, email, password, phone, specialization,
            license_number, experience_years, address, city, state
        } = req.body;

        // Check if email already exists
        const existingEmail = await Doctor.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                error: 'Email already registered',
                message: 'An account with this email already exists'
            });
        }

        // Check if license number already exists
        const existingLicense = await Doctor.findOne({ license_number });
        if (existingLicense) {
            return res.status(400).json({
                error: 'License number already registered',
                message: 'An account with this license number already exists'
            });
        }

        // Create new doctor
        const doctor = new Doctor({
            name,
            email,
            password,
            phone,
            specialization,
            license_number,
            experience_years,
            address,
            city,
            state
        });

        await doctor.save();

        // Generate token
        const token = generateToken({
            id: doctor._id,
            email: doctor.email,
            role: doctor.role || 'doctor'
        });

        // Return success response
        res.status(201).json({
            message: 'Doctor registered successfully',
            token,
            doctor: doctor.toPublicJSON()
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.code === 11000) {
            // Duplicate key error
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                error: 'Duplicate field',
                message: `${field} already exists`
            });
        }

        res.status(500).json({
            error: 'Registration failed',
            message: 'Internal server error during registration'
        });
    }
});

// Login doctor
router.post('/login', loginValidation, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find doctor by email
        const doctor = await Doctor.findOne({ email });
        if (!doctor) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Check password
        const isValidPassword = await doctor.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Generate token
        const token = generateToken({
            id: doctor._id,
            email: doctor.email,
            role: doctor.role || 'doctor'
        });

        // Return success response
        res.json({
            message: 'Login successful',
            token,
            doctor: doctor.toPublicJSON()
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: 'Internal server error during login'
        });
    }
});

// Get current user profile
router.get('/profile', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        res.json({
            doctor: req.user
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            error: 'Failed to get profile',
            message: 'Internal server error'
        });
    }
});

// Update profile
router.put('/profile', require('../middleware/auth').authenticateToken, async (req, res) => {
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
        console.error('Profile update error:', error);
        res.status(500).json({
            error: 'Failed to update profile',
            message: 'Internal server error'
        });
    }
});

// Change password
router.put('/change-password', require('../middleware/auth').authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        const doctor = await Doctor.findById(req.user._id);
        if (!doctor) {
            return res.status(404).json({
                error: 'Doctor not found',
                message: 'Doctor profile not found'
            });
        }

        // Verify current password
        const isValidPassword = await doctor.comparePassword(currentPassword);
        if (!isValidPassword) {
            return res.status(400).json({
                error: 'Invalid current password',
                message: 'Current password is incorrect'
            });
        }

        // Update password
        doctor.password = newPassword;
        await doctor.save();

        res.json({
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            error: 'Failed to change password',
            message: 'Internal server error'
        });
    }
});

module.exports = router; 