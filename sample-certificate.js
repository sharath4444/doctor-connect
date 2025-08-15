const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create certificates directory if it doesn't exist
const certificatesDir = path.join(__dirname, 'certificates');
if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir);
}

function generateSampleCertificate() {
    const doc = new PDFDocument({
        size: 'A4',
        margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
        }
    });

    const filePath = path.join(certificatesDir, 'sample-certificate.pdf');
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header with logo and title
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('SERVICE CERTIFICATE', { align: 'center' });

    doc.moveDown(0.5);

    // Government Hospital Header
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#34495e')
       .text('Government General Hospital', { align: 'center' });

    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#7f8c8d')
       .text('Mumbai, Maharashtra', { align: 'center' });

    doc.moveDown(1);

    // Certificate Number
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Certificate Number: DC-2024-001234');

    doc.moveDown(1);

    // Main content
    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#2c3e50')
       .text('This is to certify that');

    doc.moveDown(0.5);

    // Doctor's name
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#e74c3c')
       .text('Dr. John Doe', { align: 'center' });

    doc.moveDown(0.5);

    // Doctor details
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#2c3e50')
       .text('License Number: MD-12345')
       .text('Specialization: Cardiology');

    doc.moveDown(1);

    // Service details
    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#2c3e50')
       .text('has successfully completed their service at our hospital with the following details:');

    doc.moveDown(1);

    // Service information in a table-like format
    const serviceInfo = [
        { label: 'Department', value: 'Cardiology' },
        { label: 'Service Period', value: 'January 15, 2024 - March 15, 2024' },
        { label: 'Total Hours Completed', value: '160 hours' },
        { label: 'Service Hours per Week', value: '20 hours' },
        { label: 'Service Type', value: 'Voluntary Medical Service' }
    ];

    serviceInfo.forEach(info => {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#34495e')
           .text(`${info.label}:`, { continued: true })
           .font('Helvetica')
           .fillColor('#2c3e50')
           .text(` ${info.value}`);
    });

    doc.moveDown(1);

    // Performance and contribution
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Performance and Contribution:');

    doc.moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#2c3e50')
       .text('Dr. John Doe has demonstrated exceptional professional competence and dedication during their service period. They have actively participated in patient care, medical procedures, and contributed significantly to the cardiology department\'s operations. Their commitment to healthcare excellence and patient welfare has been exemplary.');

    doc.moveDown(1);

    // Signature section
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('This certificate is issued on:', { continued: true })
       .font('Helvetica')
       .text(' March 16, 2024');

    doc.moveDown(2);

    // Signature line
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('_________________________')
       .text('Dr. Sarah Johnson', { align: 'center' })
       .font('Helvetica')
       .fontSize(10)
       .text('Medical Superintendent', { align: 'center' })
       .text('Government General Hospital', { align: 'center' });

    doc.moveDown(1);

    // Hospital stamp area
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#7f8c8d')
       .text('Official Stamp', { align: 'center' });

    doc.moveDown(1);

    // Footer
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#7f8c8d')
       .text('This certificate is digitally generated and can be verified at: www.doctorconnect.gov.in', { align: 'center' });

    // Add some decorative elements
    doc.rect(30, 30, 535, 750)
       .lineWidth(2)
       .strokeColor('#bdc3c7')
       .stroke();

    // Add watermark
    doc.save()
       .translate(297, 420)
       .rotate(-45)
       .fontSize(60)
       .font('Helvetica')
       .fillColor('#ecf0f1')
       .text('CERTIFICATE', { align: 'center' })
       .restore();

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('finish', () => {
            console.log('✅ Sample certificate generated successfully!');
            console.log(`📄 File saved as: ${filePath}`);
            resolve(filePath);
        });
        stream.on('error', reject);
    });
}

// Generate the sample certificate
generateSampleCertificate()
    .then(filePath => {
        console.log('\n🎉 Sample certificate created!');
        console.log(`📁 Location: ${filePath}`);
        console.log('\n📋 Certificate Features:');
        console.log('• Professional government hospital letterhead');
        console.log('• Doctor details and service information');
        console.log('• Service period and hours completed');
        console.log('• Performance evaluation section');
        console.log('• Official signature and stamp area');
        console.log('• Digital verification information');
        console.log('• Decorative border and watermark');
    })
    .catch(error => {
        console.error('❌ Error generating certificate:', error);
    });
