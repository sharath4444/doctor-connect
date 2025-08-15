const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Ensure certificates directory exists
const certificatesDir = path.join(__dirname, '../certificates');
if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
}

// Get all certificates for the logged-in doctor
router.get('/', async (req, res) => {
    try {
        const { limit = 10, page = 1 } = req.query;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const certificates = await Certificate.find({ doctor_id: req.user._id })
            .populate('enrollment_id')
            .populate('hospital_id', 'name city state')
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ issue_date: -1 });

        const total = await Certificate.countDocuments({ doctor_id: req.user._id });

        res.json({
            certificates,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                hasNext: skip + certificates.length < total,
                hasPrev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Get certificates error:', error);
        res.status(500).json({
            error: 'Failed to fetch certificates',
            message: 'Internal server error'
        });
    }
});

// Get certificate by ID
router.get('/:id', async (req, res) => {
    try {
        const certificate = await Certificate.findOne({
            _id: req.params.id,
            doctor_id: req.user._id
        })
        .populate('enrollment_id')
        .populate('hospital_id', 'name city state address phone email')
        .populate('doctor_id', 'name specialization license_number');

        if (!certificate) {
            return res.status(404).json({
                error: 'Certificate not found',
                message: 'Certificate with this ID does not exist'
            });
        }

        res.json({ certificate });

    } catch (error) {
        console.error('Get certificate error:', error);
        res.status(500).json({
            error: 'Failed to fetch certificate',
            message: 'Internal server error'
        });
    }
});

// Generate certificate for completed enrollment
router.post('/generate/:enrollmentId', async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({
            _id: req.params.enrollmentId,
            doctor_id: req.user._id,
            status: 'completed'
        }).populate('hospital_id doctor_id');

        if (!enrollment) {
            return res.status(404).json({
                error: 'Enrollment not found',
                message: 'Completed enrollment with this ID does not exist'
            });
        }

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

        // Calculate total hours
        const totalHours = enrollment.total_hours_completed || 
                          (enrollment.service_hours * enrollment.durationDays / 7);

        // Generate certificate number
        const certificateNumber = Certificate.generateCertificateNumber();

        // Create certificate record
        const certificate = new Certificate({
            enrollment_id: enrollment._id,
            doctor_id: req.user._id,
            hospital_id: enrollment.hospital_id._id,
            certificate_number: certificateNumber,
            issue_date: new Date(),
            service_period: `${enrollment.start_date.toLocaleDateString()} - ${enrollment.end_date.toLocaleDateString()}`,
            total_hours: Math.round(totalHours),
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

        res.status(201).json({
            message: 'Certificate generated successfully',
            certificate
        });

    } catch (error) {
        console.error('Generate certificate error:', error);
        res.status(500).json({
            error: 'Failed to generate certificate',
            message: 'Internal server error'
        });
    }
});

// Download certificate
router.get('/:id/download', async (req, res) => {
    try {
        const certificate = await Certificate.findOne({
            _id: req.params.id,
            doctor_id: req.user._id
        });

        if (!certificate) {
            return res.status(404).json({
                error: 'Certificate not found',
                message: 'Certificate with this ID does not exist'
            });
        }

        if (!fs.existsSync(certificate.file_path)) {
            return res.status(404).json({
                error: 'Certificate file not found',
                message: 'Certificate PDF file does not exist'
            });
        }

        // Set headers for file download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.certificate_number}.pdf"`);

        // Stream the file
        const fileStream = fs.createReadStream(certificate.file_path);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Download certificate error:', error);
        res.status(500).json({
            error: 'Failed to download certificate',
            message: 'Internal server error'
        });
    }
});

// Get certificate statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const totalCertificates = await Certificate.countDocuments({ doctor_id: req.user._id });
        const verifiedCertificates = await Certificate.countDocuments({ 
            doctor_id: req.user._id, 
            isVerified: true 
        });
        const pendingVerification = await Certificate.countDocuments({ 
            doctor_id: req.user._id, 
            isVerified: false 
        });

        // Calculate total hours certified
        const certificates = await Certificate.find({ doctor_id: req.user._id });
        const totalHoursCertified = certificates.reduce((total, cert) => {
            return total + cert.total_hours;
        }, 0);

        res.json({
            stats: {
                total: totalCertificates,
                verified: verifiedCertificates,
                pendingVerification,
                totalHoursCertified
            }
        });

    } catch (error) {
        console.error('Get certificate stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch certificate statistics',
            message: 'Internal server error'
        });
    }
});

// Function to generate PDF certificate
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
               .text(`${enrollment.hospital_id.address}`)
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

            // QR Code placeholder (you can add actual QR code generation here)
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