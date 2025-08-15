const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ 
                error: 'Access token required',
                message: 'Please provide a valid authentication token'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if doctor still exists
        const doctor = await Doctor.findById(decoded.id).select('-password');
        if (!doctor) {
            return res.status(401).json({ 
                error: 'Invalid token',
                message: 'User no longer exists'
            });
        }

        req.user = doctor;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ 
                error: 'Invalid token',
                message: 'Token is not valid'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ 
                error: 'Token expired',
                message: 'Token has expired, please login again'
            });
        }
        
        console.error('Auth middleware error:', error);
        return res.status(500).json({ 
            error: 'Authentication error',
            message: 'Internal server error during authentication'
        });
    }
};

// Generate JWT token
const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { 
        expiresIn: '24h' 
    });
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            const doctor = await Doctor.findById(decoded.id).select('-password');
            if (doctor) {
                req.user = doctor;
            }
        }
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

// Admin authentication middleware
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                message: 'Please login to access this resource'
            });
        }

        // Check if user has admin role (you can add role field to Doctor model)
        if (!req.user.isAdmin) {
            return res.status(403).json({ 
                error: 'Access denied',
                message: 'Admin privileges required'
            });
        }

        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        return res.status(500).json({ 
            error: 'Authorization error',
            message: 'Internal server error during authorization'
        });
    }
};

module.exports = {
    authenticateToken,
    generateToken,
    optionalAuth,
    requireAdmin
}; 