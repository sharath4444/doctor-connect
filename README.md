# Doctor Connect - Government Hospital Enrollment System

A full-stack web application that enables doctors to enroll in nearby government hospitals for community service and receive digital certificates upon completion.

## 🏥 Features

### For Doctors
- **Registration & Authentication**: Secure doctor registration with license verification
- **Hospital Discovery**: Browse and search government hospitals by location and specialization
- **Enrollment Management**: Apply for hospital enrollments with flexible scheduling
- **Certificate Generation**: Automatic PDF certificate generation upon service completion
- **Profile Management**: Update personal information and view service history

### For Hospitals
- **Hospital Profiles**: Detailed information about facilities and specialties
- **Enrollment Tracking**: Monitor doctor enrollments and service periods
- **Certificate Verification**: Verify service certificates issued to doctors

### Technical Features
- **Responsive Design**: Modern, mobile-friendly interface
- **Real-time Updates**: Live status updates for enrollments
- **PDF Generation**: Professional certificate generation with digital signatures
- **Search & Filter**: Advanced search and filtering capabilities
- **Security**: JWT authentication and data validation

## 🛠️ Technology Stack

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with Flexbox and Grid
- **JavaScript (ES6+)**: Vanilla JavaScript with modern features
- **Font Awesome**: Icons and visual elements

### Backend
- **Node.js**: Server-side JavaScript runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB object modeling
- **JWT**: JSON Web Token authentication
- **bcryptjs**: Password hashing
- **PDFKit**: PDF generation
- **Express Validator**: Input validation

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v14 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn** package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd doctor-connect
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your configuration
nano .env
```

### 4. Database Setup
```bash
# Start MongoDB (if not already running)
mongod

# Seed the database with sample hospitals
node seed-data.js
```

### 5. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
doctor-connect/
├── models/                 # MongoDB schemas
│   ├── Doctor.js
│   ├── Hospital.js
│   ├── Enrollment.js
│   └── Certificate.js
├── routes/                 # API routes
│   ├── auth.js
│   ├── doctors.js
│   ├── hospitals.js
│   ├── enrollments.js
│   └── certificates.js
├── middleware/             # Custom middleware
│   └── auth.js
├── certificates/           # Generated PDF certificates
├── index.html             # Main HTML file
├── styles.css             # CSS styles
├── script.js              # Frontend JavaScript
├── server.js              # Express server
├── seed-data.js           # Database seeding script
├── package.json           # Dependencies and scripts
└── README.md              # Project documentation
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/doctor-connect

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3000
NODE_ENV=development

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
```

### Database Configuration

The application uses MongoDB with the following collections:
- `doctors`: Doctor profiles and authentication
- `hospitals`: Government hospital information
- `enrollments`: Doctor-hospital enrollment records
- `certificates`: Generated service certificates

## 📖 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new doctor account.

**Request Body:**
```json
{
  "name": "Dr. John Doe",
  "email": "john.doe@email.com",
  "password": "securepassword",
  "phone": "+91-9876543210",
  "specialization": "Cardiology",
  "license_number": "MED123456",
  "experience_years": 5,
  "address": "123 Medical Street",
  "city": "Mumbai",
  "state": "Maharashtra"
}
```

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "john.doe@email.com",
  "password": "securepassword"
}
```

### Hospital Endpoints

#### GET `/api/hospitals`
Get all hospitals with optional filtering.

**Query Parameters:**
- `type`: Filter by hospital type (government/private)
- `specialization`: Filter by medical specialization
- `city`: Filter by city
- `state`: Filter by state
- `limit`: Number of results per page
- `page`: Page number

#### GET `/api/hospitals/:id`
Get specific hospital details.

### Enrollment Endpoints

#### POST `/api/enrollments`
Create a new enrollment (requires authentication).

**Request Body:**
```json
{
  "hospital_id": "hospital_id_here",
  "start_date": "2024-01-15",
  "end_date": "2024-03-15",
  "service_hours": 20,
  "department": "Cardiology",
  "notes": "Additional notes"
}
```

#### GET `/api/enrollments`
Get all enrollments for the authenticated doctor.

### Certificate Endpoints

#### POST `/api/certificates/generate/:enrollmentId`
Generate certificate for completed enrollment.

#### GET `/api/certificates/:id/download`
Download certificate PDF.

## 🔐 Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive validation for all inputs
- **CORS Protection**: Configured CORS for security
- **Helmet.js**: Security headers middleware

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Works on all device sizes
- **Interactive Elements**: Smooth animations and transitions
- **User Feedback**: Success/error messages and loading states
- **Accessibility**: Semantic HTML and keyboard navigation

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment
1. Set environment variables for production
2. Build the application
3. Deploy to your preferred hosting platform

### Docker Deployment (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact: info@doctorconnect.com

## 🔄 Version History

- **v1.0.0**: Initial release with core functionality
- Basic doctor registration and authentication
- Hospital browsing and enrollment
- Certificate generation
- Responsive design

## 🎯 Future Enhancements

- [ ] Admin dashboard for hospital management
- [ ] Real-time notifications
- [ ] Mobile app development
- [ ] Advanced analytics and reporting
- [ ] Integration with government health portals
- [ ] Multi-language support
- [ ] Advanced certificate verification system

---

**Built with ❤️ for the healthcare community** 