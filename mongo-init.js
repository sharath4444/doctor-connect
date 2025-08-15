db = db.getSiblingDB('doctor-connect');

// Create collections
db.createCollection('doctors');
db.createCollection('hospitals');
db.createCollection('enrollments');
db.createCollection('certificates');

// Create indexes for better performance
db.doctors.createIndex({ "email": 1 }, { unique: true });
db.doctors.createIndex({ "license_number": 1 }, { unique: true });
db.hospitals.createIndex({ "name": 1 });
db.enrollments.createIndex({ "doctor_id": 1 });
db.enrollments.createIndex({ "hospital_id": 1 });
db.certificates.createIndex({ "doctor_id": 1 });

print('MongoDB initialization completed for doctor-connect database');
