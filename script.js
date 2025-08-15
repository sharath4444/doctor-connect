// Global variables
let currentUser = null;
let hospitals = [];
let enrollments = [];
let certificates = [];

// API Base URL - Detect environment and set appropriate base URL
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? '/api' 
    : '/.netlify/functions/api';

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const enrollmentModal = document.getElementById('enrollment-modal');
const navMenu = document.getElementById('nav-menu');
const navToggle = document.getElementById('nav-toggle');

// Show specific section
function showSection(sectionId) {
    // Hide all sections first
    const sections = ['home', 'hospitals', 'enrollments', 'certificates', 'admin'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = 'none';
        }
    });
    
    // Show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Handle role-based visibility after showing the section
    if (currentUser) {
        if (currentUser.role === 'admin') {
            // Hide doctor-only sections for admin
            document.querySelectorAll('.doctor-only').forEach(element => {
                element.style.display = 'none';
            });
        } else {
            // Hide admin section for regular doctors
            document.getElementById('admin').style.display = 'none';
        }
        
        // Load data for specific sections if needed
        if (sectionId === 'enrollments' && enrollments.length === 0) {
            console.log('Loading enrollments for section display');
            loadEnrollments();
        }
        
        if (sectionId === 'certificates' && certificates.length === 0) {
            console.log('Loading certificates for section display');
            loadCertificates();
        }
    }
}

// Handle dashboard link click
function handleDashboardClick(e) {
    e.preventDefault();
    
    if (!currentUser) {
        // User not logged in, show login modal
        showModal(loginModal);
        showMessage('Please login to access the Dashboard', 'info');
        return;
    }
    
    // Check if user is admin
    if (currentUser.role !== 'admin') {
        showMessage('Access denied. Only administrators can access the Dashboard.', 'error');
        return;
    }
    
    // User is admin, show admin section
    showSection('admin');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing application...');
    
    // Hide admin section and dashboard link by default
    document.getElementById('admin').style.display = 'none';
    const dashboardLink = document.getElementById('dashboard-link');
    if (dashboardLink) {
        dashboardLink.style.display = 'none';
    }
    
    // Hide doctor-only sections by default
    document.querySelectorAll('.doctor-only').forEach(element => {
        element.style.display = 'none';
    });
    
    initializeApp();
    setupEventListeners();
    
    // Add a small delay to ensure everything is loaded before checking auth
    setTimeout(() => {
        checkAuthStatus();
    }, 100);
    
    // Add error handling for unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
    });
});

// Initialize application
function initializeApp() {
    // Load hospitals on page load
    loadHospitals();

    // Restore user info from localStorage
    const userStr = localStorage.getItem('doctorUser');
    if (userStr) {
        currentUser = JSON.parse(userStr);
        updateUIAfterLogin();
    }

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
        loadUserData();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    loginBtn.addEventListener('click', () => showModal(loginModal));
    registerBtn.addEventListener('click', () => showModal(registerModal));
    navToggle.addEventListener('click', toggleMobileMenu);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            hideModal(modal);
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target);
        }
    });

    // Form submissions
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('enrollment-form').addEventListener('submit', handleEnrollment);

    // Modal switches
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        hideModal(loginModal);
        showModal(registerModal);
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        hideModal(registerModal);
        showModal(loginModal);
    });

    // Search and filter
    document.getElementById('hospital-search').addEventListener('input', filterHospitals);
    document.getElementById('specialization-filter').addEventListener('change', filterHospitals);

    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            // Special handling for dashboard link
            if (link.id === 'dashboard-link') {
                handleDashboardClick(e);
                return;
            }
            
            // Use showSection for proper navigation
            showSection(targetId);
        });
    });

    // Hero buttons
    document.getElementById('get-started-btn').addEventListener('click', () => {
        showSection('hospitals');
    });

    document.getElementById('learn-more-btn').addEventListener('click', () => {
        // Jump directly to footer
        document.querySelector('.footer').scrollIntoView();
    });
    
    // Event delegation for dynamic buttons
    document.addEventListener('click', (e) => {
        // Handle enroll buttons
        if (e.target.classList.contains('enroll-btn')) {
            const hospitalId = e.target.dataset.hospitalId;
            openEnrollmentModal(hospitalId);
        }
        
        // Handle download buttons
        if (e.target.classList.contains('download-btn')) {
            const certificateId = e.target.dataset.certificateId;
            downloadCertificate(certificateId);
        }

        // Handle admin buttons
        if (e.target.classList.contains('approve-btn')) {
            const enrollmentId = e.target.dataset.enrollmentId;
            approveEnrollment(enrollmentId);
        }

        if (e.target.classList.contains('reject-btn')) {
            const enrollmentId = e.target.dataset.enrollmentId;
            rejectEnrollment(enrollmentId);
        }

        if (e.target.classList.contains('complete-btn')) {
            const enrollmentId = e.target.dataset.enrollmentId;
            completeEnrollment(enrollmentId);
        }
    });

    // Admin buttons (guard missing elements on non-admin users or pages)
    const pendingBtn = document.getElementById('load-pending-enrollments');
    if (pendingBtn) pendingBtn.addEventListener('click', loadPendingEnrollments);
    const allBtn = document.getElementById('load-all-enrollments');
    if (allBtn) allBtn.addEventListener('click', loadAllEnrollments);

    // Refresh buttons (these may not exist in current UI, guard access)
    const refreshEnrollmentsBtn = document.getElementById('refresh-enrollments');
    if (refreshEnrollmentsBtn) {
        refreshEnrollmentsBtn.addEventListener('click', async () => {
            console.log('🔄 Manual refresh of enrollments requested');
            await loadEnrollments();
        });
    }
    
    const refreshCertificatesBtn = document.getElementById('refresh-certificates');
    if (refreshCertificatesBtn) {
        refreshCertificatesBtn.addEventListener('click', async () => {
            console.log('🔄 Manual refresh of certificates requested');
            await loadCertificates();
        });
    }

    // Form validation and character counters
    setupFormValidation();
}

// Mobile menu toggle
function toggleMobileMenu() {
    navMenu.classList.toggle('active');
}

// Modal functions
function showModal(modal) {
    modal.style.display = 'block';
    // Don't hide body overflow to allow modal scrolling
    // document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Clear previous error messages
    clearMessages();

    // Basic validation
    if (!email || !password) {
        showMessage('Please enter both email and password', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.doctor;
            localStorage.setItem('doctorUser', JSON.stringify(data.doctor));
            hideModal(loginModal);
            updateUIAfterLogin();
            showMessage('Login successful!', 'success');
            await loadEnrollments();
            await loadCertificates();
        } else {
            const errorMessage = data.error || data.message || 'Invalid email or password';
            showMessage(errorMessage, 'error');
            document.getElementById('login-password').value = '';
            document.getElementById('login-password').focus();
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Network error. Please check your connection and try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    // Clear previous error messages
    clearMessages();
    
    const formData = {
        name: document.getElementById('register-name').value,
        email: document.getElementById('register-email').value,
        password: document.getElementById('register-password').value,
        phone: document.getElementById('register-phone').value,
        specialization: document.getElementById('register-specialization').value,
        license_number: document.getElementById('register-license').value,
        experience_years: parseInt(document.getElementById('register-experience').value),
        address: document.getElementById('register-address').value,
        city: document.getElementById('register-city').value,
        state: document.getElementById('register-state').value
    };

    // Basic validation
    if (!formData.name || !formData.email || !formData.password) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }

    if (formData.password.length < 6) {
        showMessage('Password must be at least 6 characters long', 'error');
        return;
    }

    // License number format validation
    const licensePattern = /^MD-\d{5}-\d{4}$/;
    if (!licensePattern.test(formData.license_number)) {
        showMessage('Please enter license number in correct format: MD-12345-2020', 'error');
        return;
    }

    // Address length validation
    if (formData.address.length > 200) {
        showMessage('Address cannot exceed 200 characters', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.doctor;
            localStorage.setItem('doctorUser', JSON.stringify(data.doctor));
            hideModal(registerModal);
            updateUIAfterLogin();
            showMessage('Registration successful!', 'success');
            await loadEnrollments();
            await loadCertificates();
        } else {
            const errorMessage = data.error || data.message || 'Registration failed. Please check your information.';
            showMessage(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Network error. Please check your connection and try again.', 'error');
    }
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('doctorUser');
    
    console.log('Checking auth status...');
    console.log('Token exists:', !!token);
    console.log('User data exists:', !!userStr);
    
    if (token && userStr) {
        try {
            currentUser = JSON.parse(userStr);
            console.log('Restored user from localStorage:', currentUser);
            updateUIAfterLogin();
            
            // Load data in background
            loadUserData().catch(error => {
                console.error('Auth check failed, will retry:', error);
                setTimeout(() => {
                    if (localStorage.getItem('token')) {
                        loadUserData();
                    }
                }, 2000);
            });
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('doctorUser');
            localStorage.removeItem('token');
        }
    } else if (token) {
        // Token exists but no user data, try to load user data
        loadUserData().catch(error => {
            console.error('Auth check failed, will retry:', error);
            setTimeout(() => {
                if (localStorage.getItem('token')) {
                    loadUserData();
                }
            }, 2000);
        });
    } else {
        console.log('No authentication found');
        updateUIAfterLogout();
    }
}

async function loadUserData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found, skipping user data load');
            return;
        }

        console.log('Loading user data from:', `${API_BASE_URL}/doctors/profile`);
        const response = await fetch(`${API_BASE_URL}/doctors/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('User data response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('User data received:', data);
            currentUser = data.doctor;
            updateUIAfterLogin();
            
            // Load data in parallel for better performance
            await Promise.all([
                loadHospitals(),
                loadEnrollments(),
                loadCertificates()
            ]);
        } else if (response.status === 401) {
            console.log('Token expired, clearing user data');
            localStorage.removeItem('token');
            localStorage.removeItem('doctorUser');
            currentUser = null;
            updateUIAfterLogout();
        } else {
            console.error('Failed to load user data:', response.status);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function updateUIAfterLogin() {
    // Update navigation
    const authButtons = document.querySelectorAll('#login-btn, #register-btn');
    authButtons.forEach(btn => btn.style.display = 'none');

    // Remove any existing user-info divs to prevent duplicates
    const existingUserInfo = document.querySelectorAll('.user-info');
    existingUserInfo.forEach(div => div.remove());

    // Add user info and logout
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.innerHTML = `
        <span>Welcome, ${currentUser.name}</span>
        <button class="nav-btn" id="logout-btn">Logout</button>
    `;
    navMenu.appendChild(userInfo);
    
    // Add event listener for logout button
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Show/hide sections based on user role
    if (currentUser.role === 'admin') {
        // Show admin features
        document.querySelectorAll('.admin-only').forEach(element => {
            element.style.display = 'block';
        });
        // Hide doctor-only sections for admin
        document.querySelectorAll('.doctor-only').forEach(element => {
            element.style.display = 'none';
        });
        // Show Dashboard link for admin
        const dashboardLink = document.getElementById('dashboard-link');
        if (dashboardLink) {
            dashboardLink.style.display = 'inline-block';
            dashboardLink.addEventListener('click', handleDashboardClick);
        }
    } else {
        // Show doctor-only sections for regular doctors
        document.querySelectorAll('.doctor-only').forEach(element => {
            element.style.display = 'block';
        });
        // Show all nav links for doctors
        document.querySelectorAll('.nav-link').forEach(link => {
            link.style.display = 'inline-block';
        });
        // Hide Dashboard link for doctors
        const dashboardLink = document.getElementById('dashboard-link');
        if (dashboardLink) {
            dashboardLink.style.display = 'none';
        }
        // Show both enrollments and certificates sections
        document.getElementById('enrollments').style.display = 'block';
        document.getElementById('certificates').style.display = 'block';
    }

    // Don't show admin section by default - only when user clicks dashboard
    // Check if user is admin and update admin controls visibility
    updateAdminControlsVisibility();
}

function logout() {
    try {
        localStorage.removeItem('token');
        localStorage.removeItem('doctorUser');
        sessionStorage.clear();
        currentUser = null;
        updateUIAfterLogout();
        enrollments = [];
        certificates = [];
        window.location.reload();
    } catch (error) {
        console.error('Error in logout function:', error);
        window.location.reload();
    }
}

function updateUIAfterLogout() {
    // Remove user info from navigation
    const existingUserInfo = document.querySelectorAll('.user-info');
    existingUserInfo.forEach(div => div.remove());
    
    // Show auth buttons
    const authButtons = document.querySelectorAll('#login-btn, #register-btn');
    authButtons.forEach(btn => btn.style.display = 'inline-block');
    
    // Hide navigation links
    document.querySelectorAll('.nav-link').forEach(link => link.style.display = 'none');
    
    // Hide dashboard link
    const dashboardLink = document.getElementById('dashboard-link');
    if (dashboardLink) dashboardLink.style.display = 'none';
    
    // Hide admin section
    document.getElementById('admin').style.display = 'none';
    document.querySelectorAll('.admin-only').forEach(element => element.style.display = 'none');
    document.querySelectorAll('.doctor-only').forEach(element => element.style.display = 'none');
}

// Hospital functions
async function loadHospitals() {
    try {
        showLoading('hospitals-grid');
        
        const response = await fetch(`${API_BASE_URL}/hospitals?limit=200`);
        const data = await response.json();

        if (response.ok) {
            hospitals = data.hospitals;
            displayHospitals(hospitals);
        } else {
            showMessage('Failed to load hospitals', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

function displayHospitals(hospitalsToShow) {
    const grid = document.getElementById('hospitals-grid');
    
    if (hospitalsToShow.length === 0) {
        grid.innerHTML = '<p class="no-data">No hospitals found.</p>';
        return;
    }

    grid.innerHTML = hospitalsToShow.map(hospital => `
        <div class="hospital-card">
            <h3>${hospital.name}</h3>
            <div class="hospital-info">
                <p><i class="fas fa-map-marker-alt"></i> ${hospital.address || 'Address not available'}, ${hospital.city}, ${hospital.state}</p>
                <p><i class="fas fa-users"></i> Capacity: ${hospital.capacity || 'Not specified'} patients</p>
                <p><i class="fas fa-hospital"></i> Type: ${hospital.type}</p>
            </div>
            <div class="specialties">
                ${hospital.specialties && hospital.specialties.length > 0 ? 
                    hospital.specialties.map(specialty => 
                        `<span class="specialty-tag">${specialty}</span>`
                    ).join('') : 
                    '<span class="specialty-tag">General Medicine</span>'
                }
            </div>
            <button class="enroll-btn" data-hospital-id="${hospital._id}">
                Enroll Now
            </button>
        </div>
    `).join('');
}

function filterHospitals() {
    const searchTerm = document.getElementById('hospital-search').value.toLowerCase();
    const specializationFilter = document.getElementById('specialization-filter').value;

    const filtered = hospitals.filter(hospital => {
        const matchesSearch = hospital.name.toLowerCase().includes(searchTerm) ||
                            hospital.city.toLowerCase().includes(searchTerm) ||
                            hospital.state.toLowerCase().includes(searchTerm);
        
        const matchesSpecialization = !specializationFilter || 
                                    hospital.specialties.includes(specializationFilter);

        return matchesSearch && matchesSpecialization;
    });

    displayHospitals(filtered);
}

// Enrollment functions
function openEnrollmentModal(hospitalId) {
    if (!currentUser) {
        showMessage('Please login to enroll', 'error');
        return;
    }

    const hospital = hospitals.find(h => h._id === hospitalId);
    if (!hospital) return;

    // Populate hospital info
    document.getElementById('enrollment-hospital-info').innerHTML = `
        <h4>${hospital.name}</h4>
        <p><i class="fas fa-map-marker-alt"></i> ${hospital.address || 'Address not available'}, ${hospital.city}</p>
        <p><i class="fas fa-hospital"></i> Type: ${hospital.type}</p>
    `;

    // Populate departments
    const departmentSelect = document.getElementById('enrollment-department');
    departmentSelect.innerHTML = '<option value="">Select Department</option>' +
        hospital.specialties.map(specialty => 
            `<option value="${specialty}">${specialty}</option>`
        ).join('');

    // Set minimum date to today
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start from tomorrow
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    document.getElementById('enrollment-start-date').min = tomorrowStr;
    document.getElementById('enrollment-end-date').min = tomorrowStr;
    
    // Set default values to tomorrow and next week
    document.getElementById('enrollment-start-date').value = tomorrowStr;
    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('enrollment-end-date').value = nextWeek.toISOString().split('T')[0];

    // Store hospital ID for form submission
    document.getElementById('enrollment-form').dataset.hospitalId = hospitalId;

    showModal(enrollmentModal);
}

async function handleEnrollment(e) {
    e.preventDefault();
    
    // Get hospital ID from the form's dataset
    const hospitalId = document.getElementById('enrollment-form').dataset.hospitalId;
    
    if (!hospitalId) {
        showMessage('Hospital information not found. Please try again.', 'error');
        return;
    }
    
    const formData = {
        hospital_id: hospitalId,
        start_date: document.getElementById('enrollment-start-date').value,
        end_date: document.getElementById('enrollment-end-date').value,
        service_hours: parseInt(document.getElementById('enrollment-hours').value),
        department: document.getElementById('enrollment-department').value,
        notes: document.getElementById('enrollment-notes').value
    };
    
    // Validate required fields
    if (!formData.start_date || !formData.end_date || !formData.service_hours || !formData.department) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/enrollments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            hideModal(enrollmentModal);
            showMessage('Enrollment submitted successfully!', 'success');
            loadEnrollments();
        } else {
            showMessage(data.error || 'Enrollment failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function loadEnrollments() {
    if (!currentUser) {
        console.log('No current user, skipping enrollment load');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No authentication token found');
        return;
    }
    
    try {
        console.log('Loading enrollments from:', `${API_BASE_URL}/enrollments`);
        const response = await fetch(`${API_BASE_URL}/enrollments`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Enrollments response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Enrollments data:', data);
            enrollments = data.enrollments || [];
            displayEnrollments();
        } else {
            const errorData = await response.json();
            console.error('Failed to load enrollments:', errorData);
            if (response.status === 401) {
                console.log('Token expired, clearing user data');
                localStorage.removeItem('token');
                localStorage.removeItem('doctorUser');
                currentUser = null;
                location.reload();
            }
        }
    } catch (error) {
        console.error('Error loading enrollments:', error);
    }
}

function displayEnrollments() {
    const container = document.getElementById('enrollments-list');
    if (enrollments.length === 0) {
        container.innerHTML = '<p class="no-data">No enrollments found.</p>';
        return;
    }
    container.innerHTML = enrollments.map(enrollment => {
        const hospital = enrollment.hospital_id;
        const startDate = new Date(enrollment.start_date).toLocaleDateString();
        const endDate = new Date(enrollment.end_date).toLocaleDateString();
        return `
            <div class="enrollment-card">
                <div class="enrollment-header">
                    <h3>${hospital ? hospital.name : `Unknown Hospital (ID: ${enrollment.hospital_id})`}</h3>
                    <span class="enrollment-status status-${enrollment.status}">
                        ${enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                    </span>
                </div>
                <div class="enrollment-details">
                    <p><strong>Department:</strong> ${enrollment.department}</p>
                    <p><strong>Service Period:</strong> ${startDate} - ${endDate}</p>
                    <p><strong>Hours per Week:</strong> ${enrollment.service_hours}</p>
                    ${enrollment.notes ? `<p><strong>Notes:</strong> ${enrollment.notes}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function loadCertificates() {
    if (!currentUser) {
        console.log('No current user, skipping certificate load');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No authentication token found');
        return;
    }
    
    try {
        console.log('Loading certificates from:', `${API_BASE_URL}/certificates`);
        const response = await fetch(`${API_BASE_URL}/certificates`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Certificates response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Certificates data:', data);
            certificates = data.certificates || [];
            displayCertificates();
        } else {
            const errorData = await response.json();
            console.error('Failed to load certificates:', errorData);
            if (response.status === 401) {
                console.log('Token expired, clearing user data');
                localStorage.removeItem('token');
                localStorage.removeItem('doctorUser');
                currentUser = null;
                location.reload();
            }
        }
    } catch (error) {
        console.error('Error loading certificates:', error);
    }
}

function displayCertificates() {
    const container = document.getElementById('certificates-list');
    if (certificates.length === 0) {
        container.innerHTML = '<p class="no-data">No certificates found.</p>';
        return;
    }
    container.innerHTML = certificates.map(certificate => {
        const hospital = certificate.hospital_id;
        const issueDate = new Date(certificate.issue_date).toLocaleDateString();
        return `
            <div class="certificate-card">
                <h3>Service Certificate</h3>
                <p><strong>Hospital:</strong> ${hospital ? hospital.name : 'Unknown Hospital'}</p>
                <p><strong>Department:</strong> ${certificate.department}</p>
                <p><strong>Service Period:</strong> ${certificate.service_period}</p>
                <p><strong>Total Hours:</strong> ${certificate.total_hours}</p>
                <p><strong>Issue Date:</strong> ${issueDate}</p>
                <p><strong>Certificate Number:</strong> ${certificate.certificate_number}</p>
                <button class="download-btn" data-certificate-id="${certificate._id}">
                    <i class="fas fa-download"></i> Download Certificate
                </button>
            </div>
        `;
    }).join('');
}

async function downloadCertificate(certificateId) {
    try {
        const response = await fetch(`${API_BASE_URL}/certificates/${certificateId}/download`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            // When Netlify function returns base64-encoded PDF
            const contentType = response.headers.get('Content-Type') || '';
            if (contentType.includes('application/pdf')) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `certificate-${certificateId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                // Some platforms may return base64 explicitly in JSON
                const data = await response.json();
                if (data && data.base64) {
                    const byteCharacters = atob(data.base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `certificate-${certificateId}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else {
                    showMessage('Failed to download certificate', 'error');
                }
            }
        } else {
            const errorText = await response.text().catch(() => '');
            console.error('Download failed:', response.status, errorText);
            showMessage('Failed to download certificate', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Utility functions
function showMessage(message, type) {
    // Clear existing messages first
    clearMessages();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Add close button for error messages
    if (type === 'error') {
        messageDiv.innerHTML = `
            <span>${message}</span>
            <button class="message-close" onclick="this.parentElement.remove()">&times;</button>
        `;
    }
    
    document.body.appendChild(messageDiv);
    
    // Auto-remove after 5 seconds (except for errors)
    if (type !== 'error') {
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

function clearMessages() {
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
}

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
        </div>
    `;
}

// Add manual logout test function
function testLogout() {
    console.log('Manual logout test');
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
}

// Admin functions
function updateAdminControlsVisibility() {
    const isAdmin = currentUser && currentUser.role === 'admin';
    const adminControls = document.querySelector('.admin-controls');
    
    if (adminControls) {
        if (isAdmin) {
            adminControls.style.display = 'flex';
        } else {
            adminControls.style.display = 'none';
        }
    }
}

async function loadPendingEnrollments() {
    try {
        showLoading('admin-enrollments-list');
        
        const response = await fetch(`${API_BASE_URL}/admin/enrollments/pending`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayAdminEnrollments(data.enrollments);
        } else {
            if (response.status === 403) {
                showMessage('Access denied. Admin privileges required.', 'error');
            } else {
                showMessage('Failed to load pending enrollments', 'error');
            }
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function loadAllEnrollments() {
    try {
        showLoading('admin-enrollments-list');
        
        const response = await fetch(`${API_BASE_URL}/admin/enrollments`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayAdminEnrollments(data.enrollments);
        } else {
            if (response.status === 403) {
                showMessage('Access denied. Admin privileges required.', 'error');
            } else {
                showMessage('Failed to load enrollments', 'error');
            }
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

function displayAdminEnrollments(enrollments) {
    const container = document.getElementById('admin-enrollments-list');
    
    if (enrollments.length === 0) {
        container.innerHTML = '<p class="no-data">No enrollments found.</p>';
        return;
    }

    container.innerHTML = enrollments.map(enrollment => {
        const doctor = enrollment.doctor_id;
        const hospital = enrollment.hospital_id;
        const startDate = new Date(enrollment.start_date).toLocaleDateString();
        const endDate = new Date(enrollment.end_date).toLocaleDateString();
        
        let actionButtons = '';
        const isAdmin = currentUser && currentUser.role === 'admin';
        
        if (enrollment.status === 'pending') {
            if (isAdmin) {
                actionButtons = `
                    <button class="btn btn-success approve-btn" data-enrollment-id="${enrollment._id}">
                        Approve & Generate Certificate
                    </button>
                    <button class="btn btn-danger reject-btn" data-enrollment-id="${enrollment._id}">
                        Reject
                    </button>
                `;
            } else {
                actionButtons = '<span class="status-badge status-pending">Pending Approval</span>';
            }
        } else if (enrollment.status === 'approved') {
            const now = new Date();
            const endDateObj = new Date(enrollment.end_date);
            
            if (endDateObj <= now) {
                if (isAdmin) {
                    actionButtons = `
                        <button class="btn btn-primary complete-btn" data-enrollment-id="${enrollment._id}">
                            Mark as Completed
                        </button>
                    `;
                } else {
                    actionButtons = '<span class="status-badge status-approved">Ready for Completion</span>';
                }
            } else {
                actionButtons = '<span class="status-badge status-approved">Service in Progress</span>';
            }
        } else {
            actionButtons = `<span class="status-badge status-${enrollment.status}">${enrollment.status.toUpperCase()}</span>`;
        }
        
        return `
            <div class="admin-enrollment-card">
                <div class="enrollment-header">
                    <h3>${doctor.name} - ${hospital.name}</h3>
                    <span class="enrollment-status status-${enrollment.status}">
                        ${enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                    </span>
                </div>
                <div class="enrollment-details">
                    <p><strong>Doctor:</strong> ${doctor.name} (${doctor.specialization})</p>
                    <p><strong>License:</strong> ${doctor.license_number}</p>
                    <p><strong>Hospital:</strong> ${hospital.name}, ${hospital.city}</p>
                    <p><strong>Department:</strong> ${enrollment.department}</p>
                    <p><strong>Service Period:</strong> ${startDate} - ${endDate}</p>
                    <p><strong>Hours per Week:</strong> ${enrollment.service_hours}</p>
                    ${enrollment.notes ? `<p><strong>Notes:</strong> ${enrollment.notes}</p>` : ''}
                </div>
                <div class="enrollment-actions">
                    ${actionButtons}
                </div>
            </div>
        `;
    }).join('');
}

async function approveEnrollment(enrollmentId) {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
        showMessage('Only administrators can approve enrollments', 'error');
        return;
    }

    if (!confirm('Are you sure you want to approve this enrollment and generate a certificate?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/enrollments/${enrollmentId}/approve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Enrollment approved and certificate generated successfully!', 'success');
            loadPendingEnrollments(); // Refresh the list
        } else {
            showMessage(data.error || 'Failed to approve enrollment', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function rejectEnrollment(enrollmentId) {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
        showMessage('Only administrators can reject enrollments', 'error');
        return;
    }

    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/enrollments/${enrollmentId}/reject`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ rejection_reason: reason })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Enrollment rejected successfully!', 'success');
            loadPendingEnrollments(); // Refresh the list
        } else {
            showMessage(data.error || 'Failed to reject enrollment', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function completeEnrollment(enrollmentId) {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
        showMessage('Only administrators can complete enrollments', 'error');
        return;
    }

    if (!confirm('Are you sure you want to mark this enrollment as completed?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/enrollments/${enrollmentId}/complete`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Enrollment marked as completed!', 'success');
            loadAllEnrollments(); // Refresh the list
        } else {
            showMessage(data.error || 'Failed to complete enrollment', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Form validation and character counters
function setupFormValidation() {
    // License number validation
    const licenseInput = document.getElementById('register-license');
    if (licenseInput) {
        licenseInput.addEventListener('input', function() {
            const value = this.value;
            const licensePattern = /^MD-\d{5}-\d{4}$/;
            
            if (value && !licensePattern.test(value)) {
                this.style.borderColor = '#dc3545';
                this.title = 'Please enter license number in format: MD-12345-2020';
            } else {
                this.style.borderColor = '#28a745';
                this.title = '';
            }
        });
    }

    // Address character counter
    const addressTextarea = document.getElementById('register-address');
    if (addressTextarea) {
        // Add character counter element
        const counter = document.createElement('small');
        counter.className = 'char-counter';
        addressTextarea.parentNode.appendChild(counter);
        
        addressTextarea.addEventListener('input', function() {
            const currentLength = this.value.length;
            const maxLength = this.maxLength;
            const remaining = maxLength - currentLength;
            
            counter.textContent = `${currentLength}/${maxLength} characters`;
            
            // Update counter color based on remaining characters
            counter.className = 'char-counter';
            if (remaining <= 20) {
                counter.classList.add('warning');
            }
            if (remaining <= 10) {
                counter.classList.add('danger');
            }
        });
    }

    // Phone number formatting
    const phoneInput = document.getElementById('register-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, ''); // Remove non-digits
            if (value.length > 10) {
                value = value.substring(0, 10);
            }
            
            // Format as XXX-XXX-XXXX
            if (value.length >= 6) {
                value = value.substring(0, 3) + '-' + value.substring(3, 6) + '-' + value.substring(6);
            } else if (value.length >= 3) {
                value = value.substring(0, 3) + '-' + value.substring(3);
            }
            
            this.value = value;
        });
    }
}

// Add some CSS for user info
const style = document.createElement('style');
style.textContent = `
    .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        color: white;
        margin-left: auto;
    }
    
    .user-info span {
        font-weight: 500;
    }
    
    .user-info .nav-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .user-info .nav-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
    }
    
    .no-data {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 2rem;
    }
    
    .enrollment-details p {
        margin-bottom: 0.5rem;
        color: #666;
    }
    
    /* Enhanced message styling */
    .message {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: space-between;
        animation: slideIn 0.3s ease;
    }
    
    .message.error {
        background: #fee;
        color: #c53030;
        border: 1px solid #feb2b2;
        border-left: 4px solid #e53e3e;
    }
    
    .message.success {
        background: #f0fff4;
        color: #2f855a;
        border: 1px solid #9ae6b4;
        border-left: 4px solid #38a169;
    }
    
    .message-close {
        background: none;
        border: none;
        color: inherit;
        font-size: 18px;
        cursor: pointer;
        margin-left: 10px;
        padding: 0;
        line-height: 1;
    }
    
    .message-close:hover {
        opacity: 0.7;
    }
    
         @keyframes slideIn {
         from {
             transform: translateX(100%);
             opacity: 0;
         }
         to {
             transform: translateX(0);
             opacity: 1;
         }
     }
     
           /* Admin section styling */
      .admin {
          padding: 4rem 0;
          background: #f8f9fa;
      }
      
      .section-description {
          text-align: center;
          color: #666;
          margin-bottom: 2rem;
          font-size: 1.1rem;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
      }
      
      .section-controls {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 1rem;
          gap: 1rem;
      }
      
      .section-controls .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
      }
      
      .section-controls .btn i {
          font-size: 0.8rem;
      }
     
     .admin-controls {
         margin-bottom: 2rem;
         display: flex;
         gap: 1rem;
         flex-wrap: wrap;
     }
     
     .admin-enrollments-list {
         display: flex;
         flex-direction: column;
         gap: 1.5rem;
     }
     
     .admin-enrollment-card {
         background: white;
         border-radius: 12px;
         padding: 1.5rem;
         box-shadow: 0 2px 8px rgba(0,0,0,0.1);
         border-left: 4px solid #007bff;
     }
     
     .enrollment-actions {
         margin-top: 1rem;
         display: flex;
         gap: 0.5rem;
         flex-wrap: wrap;
     }
     
     .btn-success {
         background: #28a745;
         color: white;
         border: none;
         padding: 0.5rem 1rem;
         border-radius: 6px;
         cursor: pointer;
         font-size: 0.9rem;
     }
     
     .btn-success:hover {
         background: #218838;
     }
     
     .btn-danger {
         background: #dc3545;
         color: white;
         border: none;
         padding: 0.5rem 1rem;
         border-radius: 6px;
         cursor: pointer;
         font-size: 0.9rem;
     }
     
     .btn-danger:hover {
         background: #c82333;
     }
     
     .status-badge {
         padding: 0.5rem 1rem;
         border-radius: 20px;
         font-size: 0.8rem;
         font-weight: 500;
         text-transform: uppercase;
     }
     
     .status-badge.status-pending {
         background: #fff3cd;
         color: #856404;
     }
     
     .status-badge.status-approved {
         background: #d4edda;
         color: #155724;
     }
     
     .status-badge.status-completed {
         background: #cce5ff;
         color: #004085;
     }
     
           .status-badge.status-rejected {
          background: #f8d7da;
          color: #721c24;
      }
      
      /* Form help text styling */
      .form-help {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.875rem;
          color: #6c757d;
          font-style: italic;
      }
      
      /* Character counter styling */
      .char-counter {
          display: block;
          text-align: right;
          font-size: 0.75rem;
          color: #6c757d;
          margin-top: 0.25rem;
      }
      
      .char-counter.warning {
          color: #ffc107;
      }
      
      .char-counter.danger {
          color: #dc3545;
      }
  `;
document.head.appendChild(style);

// Utility function to test API connectivity
async function testAPIConnectivity() {
    try {
        console.log('Testing API connectivity...');
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            console.log('✅ API is accessible');
            return true;
        } else {
            console.error('❌ API returned error status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ API connectivity test failed:', error);
        return false;
    }
}

// Test API connectivity on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        testAPIConnectivity();
    }, 1000);
});