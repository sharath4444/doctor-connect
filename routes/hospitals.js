const express = require('express');
const Hospital = require('../models/Hospital');

const router = express.Router();

// Get all hospitals (public)
router.get('/', async (req, res) => {
    try {
        const { 
            type, 
            specialization, 
            city, 
            state, 
            limit = 20, 
            page = 1 
        } = req.query;

        // Build query
        const query = {};
        
        if (type) query.type = type;
        if (specialization) query.specialties = specialization;
        if (city) query.city = new RegExp(city, 'i');
        if (state) query.state = new RegExp(state, 'i');

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const hospitals = await Hospital.find(query)
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ name: 1 });

        const total = await Hospital.countDocuments(query);

        res.json({
            hospitals,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / parseInt(limit)),
                hasNext: skip + hospitals.length < total,
                hasPrev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Get hospitals error:', error);
        res.status(500).json({
            error: 'Failed to fetch hospitals',
            message: 'Internal server error'
        });
    }
});

// Get hospital by ID (public)
router.get('/:id', async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.id);
        
        if (!hospital) {
            return res.status(404).json({
                error: 'Hospital not found',
                message: 'Hospital with this ID does not exist'
            });
        }

        res.json({ hospital });

    } catch (error) {
        console.error('Get hospital error:', error);
        res.status(500).json({
            error: 'Failed to fetch hospital',
            message: 'Internal server error'
        });
    }
});

// Get hospitals by specialization
router.get('/specialization/:specialization', async (req, res) => {
    try {
        const { specialization } = req.params;
        const { limit = 10 } = req.query;

        const hospitals = await Hospital.find({
            specialties: specialization
        })
        .limit(parseInt(limit))
        .sort({ name: 1 });

        res.json({ hospitals });

    } catch (error) {
        console.error('Get hospitals by specialization error:', error);
        res.status(500).json({
            error: 'Failed to fetch hospitals',
            message: 'Internal server error'
        });
    }
});

// Get hospitals by location (nearby) - simplified version without geospatial queries
router.get('/nearby/:latitude/:longitude', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        // Since we removed geospatial features, just return all hospitals
        const hospitals = await Hospital.find()
            .limit(parseInt(limit))
            .sort({ name: 1 });

        res.json({ hospitals });

    } catch (error) {
        console.error('Get nearby hospitals error:', error);
        res.status(500).json({
            error: 'Failed to fetch nearby hospitals',
            message: 'Internal server error'
        });
    }
});

// Search hospitals
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const { limit = 10 } = req.query;

        const hospitals = await Hospital.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { city: { $regex: query, $options: 'i' } },
                { state: { $regex: query, $options: 'i' } },
                { address: { $regex: query, $options: 'i' } }
            ]
        })
        .limit(parseInt(limit))
        .sort({ name: 1 });

        res.json({ hospitals });

    } catch (error) {
        console.error('Search hospitals error:', error);
        res.status(500).json({
            error: 'Failed to search hospitals',
            message: 'Internal server error'
        });
    }
});

// Get all specializations
router.get('/specializations/all', async (req, res) => {
    try {
        const specializations = await Hospital.distinct('specialties');
        res.json({ specializations: specializations.sort() });

    } catch (error) {
        console.error('Get specializations error:', error);
        res.status(500).json({
            error: 'Failed to fetch specializations',
            message: 'Internal server error'
        });
    }
});

// Get hospitals by city
router.get('/city/:city', async (req, res) => {
    try {
        const { city } = req.params;
        const { limit = 10 } = req.query;

        const hospitals = await Hospital.find({
            city: new RegExp(city, 'i')
        })
        .limit(parseInt(limit))
        .sort({ name: 1 });

        res.json({ hospitals });

    } catch (error) {
        console.error('Get hospitals by city error:', error);
        res.status(500).json({
            error: 'Failed to fetch hospitals',
            message: 'Internal server error'
        });
    }
});

// Get hospitals by state
router.get('/state/:state', async (req, res) => {
    try {
        const { state } = req.params;
        const { limit = 20 } = req.query;

        const hospitals = await Hospital.find({
            state: new RegExp(state, 'i')
        })
        .limit(parseInt(limit))
        .sort({ name: 1 });

        res.json({ hospitals });

    } catch (error) {
        console.error('Get hospitals by state error:', error);
        res.status(500).json({
            error: 'Failed to fetch hospitals',
            message: 'Internal server error'
        });
    }
});

// Get statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const totalHospitals = await Hospital.countDocuments();
        const governmentHospitals = await Hospital.countDocuments({ 
            type: 'government'
        });
        const privateHospitals = await Hospital.countDocuments({ 
            type: 'private'
        });
        
        const cities = await Hospital.distinct('city');
        const states = await Hospital.distinct('state');
        const specializations = await Hospital.distinct('specialties');

        res.json({
            stats: {
                total: totalHospitals,
                government: governmentHospitals,
                private: privateHospitals,
                cities: cities.length,
                states: states.length,
                specializations: specializations.length
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch statistics',
            message: 'Internal server error'
        });
    }
});

module.exports = router; 