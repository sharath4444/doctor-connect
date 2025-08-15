const express = require('express');
const { body, validationResult } = require('express-validator');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Admin role middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Access denied',
            message: 'Admin privileges required'
        });
    }
    next();
};

// Apply admin role check to all routes
router.use(requireAdmin);

// Ensure certificates directory exists
const certificatesDir = path.join(__dirname, '../certificates');
if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
}

// Get all pending enrollments (for admin review)
router.get('/enrollments/pending', async (req, res) => {
    try {
        const { limit = 20, page = 1 } = req.query;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const enrollments = await Enrollment.find({ status: 'pending' })
            .populate('doctor_id', 'name email specialization license_number')
            .populate('hospital_id', 'name city state')
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 });

        const total = await Enrollment.countDocuments({ status: 'pending' });

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
        console.error('Get pending enrollments error:', error);
        res.status(500).json({
            error: 'Failed to fetch pending enrollments',
            message: 'Internal server error'
        });
    }
});

// Approve enrollment and generate certificate
router.put('/enrollments/:id/approve', async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id)
            .populate('doctor_id')
            .populate('hospital_id');

        if (!enrollment) {
            return res.status(404).json({
                error: 'Enrollment not found',
                message: 'Enrollment with this ID does not exist'
            });
        }

        if (enrollment.status !== 'pending') {
            return res.status(400).json({
                error: 'Cannot approve enrollment',
                message: 'Only pending enrollments can be approved'
            });
        }

        // Update enrollment status to approved
        enrollment.status = 'approved';
        await enrollment.save();

        // Generate certificate automatically
        try {
            // Check if certificate already exists
            const existingCertificate = await Certificate.findOne({
                enrollment_id: enrollment._id
            });

            if (existingCertificate) {
                return res.status(400).json({
                    error: 'Certificate already exists',
                    message: 'Certificate for this enrollment has already been generated'
                });
            }

            // Calculate total hours (assuming weekly hours over the duration)
            const durationDays = Math.ceil((enrollment.end_date - enrollment.start_date) / (1000 * 60 * 60 * 24));
            const totalHours = Math.round((enrollment.service_hours * durationDays) / 7);

            // Generate certificate number
            const certificateNumber = Certificate.generateCertificateNumber();

            // Create certificate record
            const certificate = new Certificate({
                enrollment_id: enrollment._id,
                doctor_id: enrollment.doctor_id._id,
                hospital_id: enrollment.hospital_id._id,
                certificate_number: certificateNumber,
                issue_date: new Date(),
                service_period: `${enrollment.start_date.toLocaleDateString()} - ${enrollment.end_date.toLocaleDateString()}`,
                total_hours: totalHours,
                department: enrollment.department
            });

            // Generate PDF certificate
            const fileName = `certificate-${certificateNumber}.pdf`;
            const filePath = path.join(certificatesDir, fileName);
            
            await generateCertificatePDF(certificate, enrollment, filePath);

            // Update certificate with file path
            certificate.file_path = filePath;
            certificate.file_size = fs.statSync(filePath).size;

            await certificate.save();

            res.json({
                message: 'Enrollment approved and certificate generated successfully',
                enrollment,
                certificate
            });

        } catch (certError) {
            console.error('Certificate generation error:', certError);
            // Even if certificate generation fails, enrollment is still approved
            res.json({
                message: 'Enrollment approved successfully, but certificate generation failed',
                enrollment,
                certificateError: certError.message
            });
        }

    } catch (error) {
        console.error('Approve enrollment error:', error);
        res.status(500).json({
            error: 'Failed to approve enrollment',
            message: 'Internal server error'
        });
    }
});

// Reject enrollment
router.put('/enrollments/:id/reject', [
    body('rejection_reason')
        .isLength({ min: 1, max: 500 })
        .withMessage('Rejection reason is required and cannot exceed 500 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                errors: errors.array()
            });
        }

        const enrollment = await Enrollment.findById(req.params.id);

        if (!enrollment) {
            return res.status(404).json({
                error: 'Enrollment not found',
                message: 'Enrollment with this ID does not exist'
            });
        }

        if (enrollment.status !== 'pending') {
            return res.status(400).json({
                error: 'Cannot reject enrollment',
                message: 'Only pending enrollments can be rejected'
            });
        }

        // Update enrollment status to rejected
        enrollment.status = 'rejected';
        enrollment.rejection_reason = req.body.rejection_reason;
        await enrollment.save();

        res.json({
            message: 'Enrollment rejected successfully',
            enrollment
        });

    } catch (error) {
        console.error('Reject enrollment error:', error);
        res.status(500).json({
            error: 'Failed to reject enrollment',
            message: 'Internal server error'
        });
    }
});

// Complete enrollment (when service period ends)
router.put('/enrollments/:id/complete', async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id);

        if (!enrollment) {
            return res.status(404).json({
                error: 'Enrollment not found',
                message: 'Enrollment with this ID does not exist'
            });
        }

        if (enrollment.status !== 'approved') {
            return res.status(400).json({
                error: 'Cannot complete enrollment',
                message: 'Only approved enrollments can be completed'
            });
        }

        // Check if service period has ended
        const now = new Date();
        if (enrollment.end_date > now) {
            return res.status(400).json({
                error: 'Cannot complete enrollment',
                message: 'Service period has not ended yet'
            });
        }

        // Update enrollment status to completed
        enrollment.status = 'completed';
        await enrollment.save();

        res.json({
            message: 'Enrollment completed successfully',
            enrollment
        });

    } catch (error) {
        console.error('Complete enrollment error:', error);
        res.status(500).json({
            error: 'Failed to complete enrollment',
            message: 'Internal server error'
        });
    }
});

// Get all enrollments (admin view)
router.get('/enrollments', async (req, res) => {
    try {
        const { status, limit = 20, page = 1 } = req.query;

        // Build query
        const query = {};
        if (status) query.status = status;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const enrollments = await Enrollment.find(query)
            .populate('doctor_id', 'name email specialization license_number')
            .populate('hospital_id', 'name city state')
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

// Function to generate PDF certificate (same as in certificates.js)
async function generateCertificatePDF(certificate, enrollment, filePath) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: {
                    top: 50,
                    bottom: 50,
                    left: 50,
                    right: 50
                }
            });

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // Header
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .text('CERTIFICATE OF SERVICE', { align: 'center' })
               .moveDown();

            doc.fontSize(16)
               .font('Helvetica-Bold')
               .text('Doctor Connect - Government Hospital Service', { align: 'center' })
               .moveDown(2);

            // Certificate number
            doc.fontSize(12)
               .font('Helvetica')
               .text(`Certificate Number: ${certificate.certificate_number}`)
               .moveDown();

            // Issue date
            doc.text(`Issue Date: ${certificate.issue_date.toLocaleDateString()}`)
               .moveDown(2);

            // Main content
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .text('This is to certify that', { align: 'center' })
               .moveDown();

            doc.fontSize(16)
               .font('Helvetica-Bold')
               .text(`${enrollment.doctor_id.name}`, { align: 'center' })
               .moveDown();

            doc.fontSize(14)
               .font('Helvetica')
               .text(`License Number: ${enrollment.doctor_id.license_number}`)
               .moveDown();

            doc.fontSize(14)
               .font('Helvetica')
               .text(`Specialization: ${enrollment.doctor_id.specialization}`)
               .moveDown(2);

            // Service details
            doc.fontSize(14)
               .font('Helvetica')
               .text(`Has successfully completed their service at:`)
               .moveDown();

            doc.fontSize(16)
               .font('Helvetica-Bold')
               .text(`${enrollment.hospital_id.name}`, { align: 'center' })
               .moveDown();

            doc.fontSize(14)
               .font('Helvetica')
               .text(`${enrollment.hospital_id.address || 'Address not available'}`)
               .text(`${enrollment.hospital_id.city}, ${enrollment.hospital_id.state}`)
               .moveDown(2);

            // Service period and hours
            doc.fontSize(14)
               .font('Helvetica')
               .text(`Service Period: ${certificate.service_period}`)
               .moveDown();

            doc.fontSize(14)
               .font('Helvetica')
               .text(`Department: ${certificate.department}`)
               .moveDown();

            doc.fontSize(14)
               .font('Helvetica')
               .text(`Total Hours Served: ${certificate.total_hours} hours`)
               .moveDown(3);

            // Signature section
            doc.fontSize(12)
               .font('Helvetica')
               .text('This certificate is issued in recognition of the valuable service')
               .text('provided to the community through government healthcare facilities.')
               .moveDown(2);

            // Footer
            doc.fontSize(10)
               .font('Helvetica')
               .text('This is a digitally generated certificate and does not require a physical signature.')
               .moveDown();

            doc.fontSize(10)
               .font('Helvetica')
               .text('For verification, please contact: info@doctorconnect.com')
               .moveDown();

            // QR Code placeholder
            doc.fontSize(8)
               .font('Helvetica')
               .text(`Verification Code: ${certificate.certificate_number}`, { align: 'center' });

            doc.end();

            stream.on('finish', () => {
                resolve();
            });

            stream.on('error', (error) => {
                reject(error);
            });

        } catch (error) {
            reject(error);
        }
    });
}

module.exports = router;
