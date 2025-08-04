// auth.js - Authentication module
// This module handles user authentication and authorization

// Auth state
let currentUser = null;
let isAuthenticated = false;
let userRoles = [];
let authToken = null;

// Configuration
const AUTH_STORAGE_KEY = 'family_tree_auth';
const AUTH_API_BASE_URL = 'http://localhost:5050/auth';

/**
 * Initialize authentication from local storage if present
 */
export function initAuth() {
    try {
        // Try to restore session from localStorage
        const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedAuth) {
            const authData = JSON.parse(storedAuth);
            currentUser = authData.user;
            isAuthenticated = true;
            userRoles = authData.roles || [];
            authToken = authData.token;

            // Verify token is still valid
            verifyTokenValidity();

            console.log('Auth restored from storage for user:', currentUser.email || currentUser.username);
        }
    } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear potentially corrupted auth data
        clearAuthData();
    }

    // Update UI based on auth state
    updateAuthUI();
}

/**
 * Verify if the stored token is still valid
 */
async function verifyTokenValidity() {
    if (!authToken) return;

    try {
        const response = await fetch(`${AUTH_API_BASE_URL}/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Token verification failed');
        }

        const data = await response.json();
        if (data.valid) {
            // Token is valid, update user info if provided
            if (data.user) {
                currentUser = { ...currentUser, ...data.user };
            }
        } else {
            // Token is invalid, clear auth data
            clearAuthData();
        }
    } catch (error) {
        console.error('Token verification error:', error);
        // If verification fails, clear auth data
        clearAuthData();
    }
}

/**
 * Login with email and password
 * @param {string} email - The email address
 * @param {string} password - The password
 * @returns {Promise<Object>} The login result
 */
export async function login(email, password) {
    try {
        // Make API call to backend authentication endpoint
        const response = await fetch(`${AUTH_API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            // Successful login
            authToken = data.token;
            currentUser = {
                email: email,
                displayName: data.user?.displayName || data.user?.name || email.split('@')[0],
                id: data.user?.id,
                ...data.user // Include any other user properties from backend
            };

            // Set default roles - you can customize this based on your backend response
            userRoles = data.user?.roles || ['user'];
            if (data.user?.isAdmin) {
                userRoles.push('admin');
            }

            isAuthenticated = true;

            // Store auth info in localStorage
            const authData = {
                user: currentUser,
                roles: userRoles,
                token: authToken,
                timestamp: Date.now()
            };
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));

            // Update UI
            updateAuthUI();

            console.log('Login successful for user:', email);
            return { success: true, user: currentUser };
        } else {
            // Failed login
            console.log('Login failed for user:', email);
            throw new Error(data.message || 'Invalid email or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Log out the current user
 */
export async function logout() {
    try {
        // Call backend logout endpoint if token exists
        if (authToken) {
            await fetch(`${AUTH_API_BASE_URL}/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
        }
    } catch (error) {
        console.error('Logout API call failed:', error);
        // Continue with local logout even if API call fails
    }

    // Clear auth state
    clearAuthData();

    console.log('User logged out');
}

/**
 * Clear all authentication data
 */
function clearAuthData() {
    currentUser = null;
    isAuthenticated = false;
    userRoles = [];
    authToken = null;

    // Remove from localStorage
    localStorage.removeItem(AUTH_STORAGE_KEY);

    // Update UI
    updateAuthUI();
}

/**
 * Get authentication token for API requests
 * @returns {string|null} The authentication token
 */
export function getAuthToken() {
    return authToken;
}

/**
 * Get authentication headers for API requests
 * @returns {Object} Headers object with authorization
 */
export function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export function isUserAuthenticated() {
    return isAuthenticated;
}

/**
 * Check if user has a specific role
 * @param {string} role - The role to check
 * @returns {boolean} True if user has the role
 */
export function hasRole(role) {
    return isAuthenticated && userRoles.includes(role);
}

/**
 * Get current user
 * @returns {Object|null} The current user or null if not authenticated
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Update UI elements based on authentication state
 */
function updateAuthUI() {
    // Find auth-related UI elements
    const authButtons = document.querySelectorAll('[data-auth-required]');
    const authUserDisplay = document.getElementById('auth-user-display');
    const loginBtn = document.getElementById('login-button');
    const logoutBtn = document.getElementById('logout-button');

    if (isAuthenticated) {
        // User is logged in - show elements that require auth
        authButtons.forEach(el => {
            el.style.display = 'block';
        });

        // Update user display if it exists
        if (authUserDisplay) {
            authUserDisplay.textContent = currentUser.displayName || currentUser.email;
            authUserDisplay.style.display = 'block';
        }

        // Show logout, hide login
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';

    } else {
        // User is not logged in - hide elements that require auth
        authButtons.forEach(el => {
            el.style.display = 'none';
        });

        // Hide user display
        if (authUserDisplay) {
            authUserDisplay.textContent = '';
            authUserDisplay.style.display = 'none';
        }

        // Show login, hide logout
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    // Dispatch an event so other components can react to auth changes
    document.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: { isAuthenticated, currentUser, userRoles }
    }));
}

/**
 * Show login form modal
 */
export function showLoginForm() {
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    document.body.appendChild(backdrop);

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'login-modal';
    modal.innerHTML = `
        <div class="login-header">
            <h2>Login</h2>
            <button class="close-modal-btn">&times;</button>
        </div>
        <form id="login-form" class="login-form">
            <div class="form-field">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-field">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            <div class="login-message" style="display: none;"></div>
            <div class="login-actions">
                <button type="submit" class="login-button">Login</button>
            </div>
        </form>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    setupLoginFormListeners(modal, backdrop);

    // Show with animation
    setTimeout(() => {
        backdrop.classList.add('visible');
        modal.classList.add('visible');
    }, 10);
}

/**
 * Set up event listeners for login form
 * @param {HTMLElement} modal - The modal element
 * @param {HTMLElement} backdrop - The backdrop element
 */
function setupLoginFormListeners(modal, backdrop) {
    // Close button
    const closeBtn = modal.querySelector('.close-modal-btn');
    closeBtn.addEventListener('click', () => {
        closeLoginModal(modal, backdrop);
    });

    // Click outside modal to close
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            closeLoginModal(modal, backdrop);
        }
    });

    // Form submission
    const form = modal.querySelector('#login-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = form.querySelector('#email').value;
        const password = form.querySelector('#password').value;
        const message = form.querySelector('.login-message');
        const submitBtn = form.querySelector('.login-button');

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        message.style.display = 'none';

        try {
            // Attempt login
            await login(email, password);

            // Show success message
            message.textContent = 'Login successful!';
            message.className = 'login-message success';
            message.style.display = 'block';

            // Close modal after short delay
            setTimeout(() => {
                closeLoginModal(modal, backdrop);
            }, 1000);

        } catch (error) {
            // Show error message
            message.textContent = error.message || 'Login failed. Please try again.';
            message.className = 'login-message error';
            message.style.display = 'block';

            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });
}

/**
 * Close login modal
 * @param {HTMLElement} modal - The modal element
 * @param {HTMLElement} backdrop - The backdrop element
 */
function closeLoginModal(modal, backdrop) {
    modal.classList.remove('visible');
    backdrop.classList.remove('visible');

    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
        if (backdrop.parentNode) {
            backdrop.parentNode.removeChild(backdrop);
        }
    }, 300);
}

/**
 * Register a new user (if your backend supports registration)
 * @param {string} email - The email address
 * @param {string} password - The password
 * @param {Object} userData - Additional user data
 * @returns {Promise<Object>} The registration result
 */
export async function register(email, password, userData = {}) {
    try {
        const response = await fetch(`${AUTH_API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                ...userData
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Registration successful for user:', email);
            return { success: true, user: data.user };
        } else {
            throw new Error(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

/**
 * Request password reset
 * @param {string} email - The email address
 * @returns {Promise<Object>} The reset result
 */
export async function requestPasswordReset(email) {
    try {
        const response = await fetch(`${AUTH_API_BASE_URL}/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Password reset requested for:', email);
            return { success: true, message: data.message };
        } else {
            throw new Error(data.message || 'Password reset request failed');
        }
    } catch (error) {
        console.error('Password reset error:', error);
        throw error;
    }
}