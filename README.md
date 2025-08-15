# Doctor Connect - Government Hospital Enrollment System

A full-stack web application that enables doctors to enroll in nearby government hospitals for community service and receive digital certificates upon completion.

## 🏥 Features

### For Doctors
- **Registration & Authentication**: Secure doctor registration with license verification
- **Hospital Discovery**: Browse and search government hospitals by location and specialization
- **Enrollment Management**: Apply for hospital enrollments with flexible scheduling
- **Certificate Generation**: Automatic PDF certificate generation upon service completion
- **Profile Management**: Update personal information and view service history
- **Enhanced Data Persistence**: Improved enrollment and certificate loading with automatic refresh handling

### For Hospitals
- **Hospital Profiles**: Detailed information about facilities and specialties
- **Enrollment Tracking**: Monitor doctor enrollments and service periods
- **Certificate Verification**: Verify service certificates issued to doctors

### For Administrators
- **Admin Dashboard**: Comprehensive enrollment management interface
- **Enrollment Approval**: Review and approve/reject doctor enrollments
- **Certificate Management**: Generate and manage service certificates
- **User Management**: Monitor doctor accounts and activities

### Technical Features
- **Responsive Design**: Modern, mobile-friendly interface
- **Real-time Updates**: Live status updates for enrollments
- **PDF Generation**: Professional certificate generation with digital signatures
- **Search & Filter**: Advanced search and filtering capabilities
- **Security**: JWT authentication and data validation
- **Enhanced Error Handling**: Comprehensive logging and debugging capabilities
- **Cross-Environment Support**: Automatic API endpoint detection for development and production
- **API Health Monitoring**: Built-in connectivity testing and health checks

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

### Deployment
- **Netlify**: Frontend hosting and serverless functions
- **MongoDB Atlas**: Cloud database hosting

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v14 or higher)
- **MongoDB** (v4.4 or higher) or **MongoDB Atlas** account
- **npm** or **yarn** package manager
- **Git** for version control

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
# For local MongoDB
mongod

# For MongoDB Atlas, update your connection string in .env
# Seed the database with sample hospitals
npm run seed
```

### 5. Create Admin Account (Optional)
```bash
# Create an admin user for managing enrollments
npm run create-admin
```

### 6. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm start

# Test API connectivity
npm run test-api
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
│   ├── certificates.js
│   └── admin.js
├── middleware/             # Custom middleware
│   └── auth.js
├── netlify/               # Netlify serverless functions
│   └── functions/
│       └── api.js
├── certificates/           # Generated PDF certificates
├── build/                 # Production build files
├── index.html             # Main HTML file
├── styles.css             # CSS styles
├── script.js              # Frontend JavaScript
├── server.js              # Express server
├── seed-data.js           # Database seeding script
├── test-api.js            # API testing script
├── build.js               # Build script
├── package.json           # Dependencies and scripts
├── netlify.toml           # Netlify configuration
└── README.md              # Project documentation
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/doctor-connect
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/doctor-connect

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
  "license_number": "MD-12345-2020",
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

#### GET `/api/auth/profile`
Get current user profile (requires authentication).

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

#### PUT `/api/enrollments/:id`
Update enrollment details (only for pending enrollments).

### Certificate Endpoints

#### GET `/api/certificates`
Get all certificates for the authenticated doctor.

#### GET `/api/certificates/:id`
Get specific certificate details.

#### GET `/api/certificates/:id/download`
Download certificate PDF.

### Admin Endpoints

#### GET `/api/admin/enrollments/pending`
Get all pending enrollments (admin only).

#### GET `/api/admin/enrollments`
Get all enrollments (admin only).

#### PUT `/api/admin/enrollments/:id/approve`
Approve an enrollment (admin only).

#### PUT `/api/admin/enrollments/:id/reject`
Reject an enrollment (admin only).

#### PUT `/api/admin/enrollments/:id/complete`
Mark enrollment as completed (admin only).

### Health Check

#### GET `/api/health`
Check API health and connectivity.

## 🔐 Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication with automatic refresh
- **Input Validation**: Comprehensive validation for all inputs
- **CORS Protection**: Configured CORS for security
- **Helmet.js**: Security headers middleware
- **Environment Detection**: Automatic API endpoint configuration for different environments

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Works on all device sizes
- **Interactive Elements**: Smooth animations and transitions
- **User Feedback**: Success/error messages and loading states
- **Accessibility**: Semantic HTML and keyboard navigation
- **Enhanced Error Handling**: Detailed error messages and debugging information
- **Automatic Data Loading**: Seamless data persistence across page refreshes

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Netlify Deployment
1. Connect your repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on git push

### Environment-Specific Configuration
The application automatically detects the environment and configures API endpoints:
- **Development**: Uses `/api` endpoints
- **Production (Netlify)**: Uses `/.netlify/functions/api` endpoints

## 🧪 Testing

### API Testing
```bash
# Test API connectivity and endpoints
npm run test-api
```

### Manual Testing
1. Open browser console (F12)
2. Check for connectivity messages
3. Test authentication flow
4. Verify data loading on page refresh

## 🔧 Troubleshooting

### Common Issues

#### Enrollments/Certificates Not Loading
- Check browser console for error messages
- Verify authentication token is present
- Ensure API endpoints are accessible
- Check network connectivity

#### Authentication Issues
- Clear browser localStorage
- Check JWT token expiration
- Verify environment variables

#### API Connectivity
- Test with `npm run test-api`
- Check Netlify function logs
- Verify MongoDB connection

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
- Phone: +91-8317502155

## 🔄 Version History

- **v1.1.0**: Enhanced Authentication & Error Handling
  - Fixed enrollment and certificate loading on page refresh
  - Improved API base URL configuration for different environments
  - Enhanced error handling and debugging capabilities
  - Added comprehensive logging and connectivity testing
  - Improved authentication flow with better token management
  - Added admin dashboard functionality

- **v1.0.0**: Initial release with core functionality
  - Basic doctor registration and authentication
  - Hospital browsing and enrollment
  - Certificate generation
  - Responsive design

## 🎯 Future Enhancements

- [ ] Real-time notifications system
- [ ] Mobile app development (React Native)
- [ ] Advanced analytics and reporting dashboard
- [ ] Integration with government health portals
- [ ] Multi-language support
- [ ] Advanced certificate verification system
- [ ] Email notifications for enrollment status changes
- [ ] Bulk enrollment management for hospitals
- [ ] Advanced search with geolocation
- [ ] Performance monitoring and optimization

## 🌟 Recent Improvements

### Enhanced User Experience
- **Seamless Data Loading**: Enrollments and certificates now load automatically on page refresh
- **Better Error Messages**: Clear, actionable error messages for users
- **Improved Navigation**: Enhanced section navigation with automatic data loading
- **Debugging Tools**: Built-in API connectivity testing and health checks

### Technical Improvements
- **Environment Detection**: Automatic API endpoint configuration
- **Enhanced Authentication**: Better token management and user state restoration
- **Comprehensive Logging**: Detailed console logging for debugging
- **Error Recovery**: Automatic retry mechanisms for failed requests
- **Performance Optimization**: Parallel data loading for better performance

---

**Built with ❤️ for the healthcare community**

*Last updated: January 2025* 