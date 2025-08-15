const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            maxPoolSize: 10,
            autoIndex: true
        });
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

// Import models
const Doctor = require('../../models/Doctor');
const Hospital = require('../../models/Hospital');
const Enrollment = require('../../models/Enrollment');
const Certificate = require('../../models/Certificate');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware functions
const authenticateToken = async (req) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        throw new Error('Access token required');
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const doctor = await Doctor.findById(decoded.id).select('-password');
        if (!doctor) {
            throw new Error('Invalid token');
        }
        return doctor;
    } catch (error) {
        throw new Error('Invalid token');
    }
};

const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

// Main handler
exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Connect to database
        await connectDB();

        const { path, httpMethod, body: requestBody, headers: requestHeaders } = event;

        // Parse body
        const body = requestBody ? JSON.parse(requestBody) : {};
        
        // Route handling
        // Support both "/api/..." (via redirects) and "/.netlify/functions/api/..." direct function paths
        const pathSegments = path.split('/').filter(Boolean);
        const apiIndex = pathSegments.indexOf('api');
        const route = apiIndex !== -1 ? pathSegments.slice(apiIndex + 1).join('/') : '';
        
        // API routes
        if (apiIndex !== -1) {
            
            // Auth routes
            if (route === 'auth/register' && httpMethod === 'POST') {
                return await handleRegister(body, headers);
            }
            
            if (route === 'auth/login' && httpMethod === 'POST') {
                return await handleLogin(body, headers);
            }
            
            // Support both /auth/profile and /doctors/profile for compatibility with Express routes
            if ((route === 'auth/profile' || route === 'doctors/profile') && httpMethod === 'GET') {
                return await handleGetProfile(requestHeaders, headers);
            }
            
            // Hospital routes
            if (route === 'hospitals' && httpMethod === 'GET') {
                return await handleGetHospitals(headers);
            }
            
            // Enrollment routes
            if (route === 'enrollments' && httpMethod === 'POST') {
                return await handleCreateEnrollment(body, requestHeaders, headers);
            }
            
            if (route === 'enrollments' && httpMethod === 'GET') {
                return await handleGetEnrollments(requestHeaders, headers);
            }
            
            // Admin routes
            if (route === 'admin/enrollments/pending' && httpMethod === 'GET') {
                return await handleGetPendingEnrollments(requestHeaders, headers);
            }
            
            if (route === 'admin/enrollments' && httpMethod === 'GET') {
                return await handleGetAllEnrollments(requestHeaders, headers);
            }
            
            if (route.startsWith('admin/enrollments/') && httpMethod === 'PUT') {
                const enrollmentId = route.split('/')[2];
                const action = route.split('/')[3];
                return await handleAdminAction(enrollmentId, action, body, requestHeaders, headers);
            }
            
            // Certificate routes
            if (route === 'certificates' && httpMethod === 'GET') {
                return await handleGetCertificates(requestHeaders, headers);
            }

            // Download certificate: certificates/:id/download
            if (route.startsWith('certificates/') && route.endsWith('/download') && httpMethod === 'GET') {
                const certId = route.split('/')[1];
                return await handleDownloadCertificate(certId, requestHeaders);
            }
            
            // Health check route
            if (route === 'health' && httpMethod === 'GET') {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ 
                        status: 'OK', 
                        message: 'Doctor Connect API is running',
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }
        
        // Default response
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Route not found' })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

// Handler functions
async function handleRegister(body, headers) {
    const errors = validationResult(body);
    if (!errors.isEmpty()) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ errors: errors.array() })
        };
    }

    const { name, email, password, phone, specialization, license_number, experience_years, address, city, state } = body;

    try {
        // Check if user already exists
        const existingDoctor = await Doctor.findOne({ email });
        if (existingDoctor) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email already registered' })
            };
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
            role: doctor.role
        });

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Doctor registered successfully',
                token,
                doctor: doctor.toPublicJSON()
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Registration failed', message: error.message })
        };
    }
}

async function handleLogin(body, headers) {
    const { email, password } = body;

    try {
        const doctor = await Doctor.findOne({ email });
        if (!doctor) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Invalid credentials' })
            };
        }

        const isPasswordValid = await doctor.comparePassword(password);
        if (!isPasswordValid) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Invalid credentials' })
            };
        }

        const token = generateToken({
            id: doctor._id,
            email: doctor.email,
            role: doctor.role
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Login successful',
                token,
                doctor: doctor.toPublicJSON()
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Login failed', message: error.message })
        };
    }
}

async function handleGetProfile(requestHeaders, headers) {
    try {
        const doctor = await authenticateToken({ headers: requestHeaders });
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ doctor })
        };
    } catch (error) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Authentication failed', message: error.message })
        };
    }
}

async function handleGetHospitals(headers) {
    try {
        const hospitals = await Hospital.find().limit(200);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ hospitals })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to fetch hospitals', message: error.message })
        };
    }
}

async function handleCreateEnrollment(body, requestHeaders, headers) {
    try {
        const doctor = await authenticateToken({ headers: requestHeaders });
        
        const enrollment = new Enrollment({
            ...body,
            doctor_id: doctor._id
        });
        
        await enrollment.save();
        
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Enrollment created successfully',
                enrollment
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to create enrollment', message: error.message })
        };
    }
}

async function handleGetEnrollments(requestHeaders, headers) {
    try {
        const doctor = await authenticateToken({ headers: requestHeaders });
        
        const enrollments = await Enrollment.find({ doctor_id: doctor._id })
            .populate('hospital_id', 'name city state')
            .sort({ createdAt: -1 });
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ enrollments })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to fetch enrollments', message: error.message })
        };
    }
}

async function handleGetPendingEnrollments(requestHeaders, headers) {
    try {
        const doctor = await authenticateToken({ headers: requestHeaders });
        
        if (doctor.role !== 'admin') {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Admin privileges required' })
            };
        }
        
        const enrollments = await Enrollment.find({ status: 'pending' })
            .populate('doctor_id', 'name specialization license_number')
            .populate('hospital_id', 'name city state')
            .sort({ createdAt: -1 });
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ enrollments })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to fetch pending enrollments', message: error.message })
        };
    }
}

async function handleGetAllEnrollments(requestHeaders, headers) {
    try {
        const doctor = await authenticateToken({ headers: requestHeaders });
        
        if (doctor.role !== 'admin') {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Admin privileges required' })
            };
        }
        
        const enrollments = await Enrollment.find()
            .populate('doctor_id', 'name specialization license_number')
            .populate('hospital_id', 'name city state')
            .sort({ createdAt: -1 });
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ enrollments })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to fetch enrollments', message: error.message })
        };
    }
}

async function handleAdminAction(enrollmentId, action, body, requestHeaders, headers) {
    try {
        const doctor = await authenticateToken({ headers: requestHeaders });
        
        if (doctor.role !== 'admin') {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Admin privileges required' })
            };
        }
        
        const enrollment = await Enrollment.findById(enrollmentId)
            .populate('doctor_id hospital_id');
        
        if (!enrollment) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Enrollment not found' })
            };
        }
        
        switch (action) {
            case 'approve':
                enrollment.status = 'approved';
                await enrollment.save();
                
                // Generate certificate
                const certificate = new Certificate({
                    enrollment_id: enrollment._id,
                    doctor_id: enrollment.doctor_id._id,
                    hospital_id: enrollment.hospital_id._id,
                    certificate_number: Certificate.generateCertificateNumber(),
                    service_period: `${enrollment.start_date} to ${enrollment.end_date}`,
                    total_hours: enrollment.service_hours * 4, // Assuming 4 weeks
                    department: enrollment.department,
                    file_path: `certificates/cert-${enrollment._id}.pdf`
                });
                
                await certificate.save();
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        message: 'Enrollment approved and certificate generated',
                        enrollment,
                        certificate
                    })
                };
                
            case 'reject':
                enrollment.status = 'rejected';
                enrollment.rejection_reason = body.rejection_reason;
                await enrollment.save();
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        message: 'Enrollment rejected',
                        enrollment
                    })
                };
                
            case 'complete':
                enrollment.status = 'completed';
                await enrollment.save();
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        message: 'Enrollment marked as completed',
                        enrollment
                    })
                };
                
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to process action', message: error.message })
        };
    }
}

async function handleGetCertificates(requestHeaders, headers) {
    try {
        const doctor = await authenticateToken({ headers: requestHeaders });
        
        const certificates = await Certificate.find({ doctor_id: doctor._id })
            .populate('hospital_id', 'name city state')
            .sort({ issue_date: -1 });
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ certificates })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to fetch certificates', message: error.message })
        };
    }
}

// Download certificate helper (serverless)
async function handleDownloadCertificate(certificateId, requestHeaders) {
    try {
        const doctor = await authenticateToken({ headers: requestHeaders });

        const certificate = await Certificate.findOne({
            _id: certificateId,
            doctor_id: doctor._id
        });

        if (!certificate) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Certificate not found' })
            };
        }

        // If file exists on disk (e.g., when using Express), return it
        if (certificate.file_path && fs.existsSync(certificate.file_path)) {
            const fileBuffer = fs.readFileSync(certificate.file_path);
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="certificate-${certificate.certificate_number}.pdf"`
                },
                isBase64Encoded: true,
                body: fileBuffer.toString('base64')
            };
        }

        // Netlify functions are stateless: generate PDF on the fly
        const enrollment = await Enrollment.findById(certificate.enrollment_id)
            .populate('doctor_id hospital_id');

        if (!enrollment) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Related enrollment not found' })
            };
        }

        const pdfBuffer = await generateCertificatePdfBuffer(certificate, enrollment);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="certificate-${certificate.certificate_number}.pdf"`
            },
            isBase64Encoded: true,
            body: pdfBuffer.toString('base64')
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to download certificate', message: error.message })
        };
    }
}

function generateCertificatePdfBuffer(certificate, enrollment) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            const chunks = [];
            doc.on('data', (d) => chunks.push(d));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            const issueDate = certificate.issue_date ? new Date(certificate.issue_date) : new Date();
            const servicePeriod = certificate.service_period || `${new Date(enrollment.start_date).toLocaleDateString()} - ${new Date(enrollment.end_date).toLocaleDateString()}`;
            const totalHours = certificate.total_hours || (enrollment.service_hours ? enrollment.service_hours * 4 : 0);

            // Header
            doc.fontSize(24).font('Helvetica-Bold').text('CERTIFICATE OF SERVICE', { align: 'center' }).moveDown();
            doc.fontSize(16).font('Helvetica-Bold').text('Doctor Connect - Government Hospital Service', { align: 'center' }).moveDown(2);

            // Meta
            doc.fontSize(12).font('Helvetica').text(`Certificate Number: ${certificate.certificate_number}`).moveDown();
            doc.text(`Issue Date: ${issueDate.toLocaleDateString()}`).moveDown(2);

            // Name
            doc.fontSize(14).font('Helvetica-Bold').text('This is to certify that', { align: 'center' }).moveDown();
            doc.fontSize(16).font('Helvetica-Bold').text(`${enrollment.doctor_id?.name || 'Doctor'}`, { align: 'center' }).moveDown();
            doc.fontSize(14).font('Helvetica').text(`License Number: ${enrollment.doctor_id?.license_number || '-'}`).moveDown();
            doc.fontSize(14).font('Helvetica').text(`Specialization: ${enrollment.doctor_id?.specialization || '-'}`).moveDown(2);

            // Hospital
            doc.fontSize(14).font('Helvetica').text('Has successfully completed their service at:').moveDown();
            doc.fontSize(16).font('Helvetica-Bold').text(`${enrollment.hospital_id?.name || 'Hospital'}`, { align: 'center' }).moveDown();
            const addr = [
                enrollment.hospital_id?.address,
                [enrollment.hospital_id?.city, enrollment.hospital_id?.state].filter(Boolean).join(', ')
            ].filter(Boolean).join('\n');
            if (addr) doc.fontSize(14).font('Helvetica').text(addr).moveDown(2);

            // Details
            doc.fontSize(14).font('Helvetica').text(`Service Period: ${servicePeriod}`).moveDown();
            doc.fontSize(14).font('Helvetica').text(`Department: ${certificate.department || enrollment.department || '-'}`).moveDown();
            doc.fontSize(14).font('Helvetica').text(`Total Hours Served: ${totalHours} hours`).moveDown(3);

            // Footer
            doc.fontSize(10).font('Helvetica').text('This is a digitally generated certificate and does not require a physical signature.').moveDown();
            doc.fontSize(10).font('Helvetica').text('For verification, please contact: info@doctorconnect.com').moveDown();
            doc.fontSize(8).font('Helvetica').text(`Verification Code: ${certificate.certificate_number}`, { align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}
