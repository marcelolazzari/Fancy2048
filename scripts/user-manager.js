/**
 * User Management System for Fancy 2048
 * Handles user authentication, session management, and user-specific data
 */

class UserManager {
  constructor() {
    this.currentUser = null;
    this.gameApiUrl = '/api';
    
    // DOM elements
    this.modal = null;
    this.loginForm = null;
    this.registerForm = null;
    this.userInfo = null;
    this.userMenu = null;
    
    // Initialize after DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
  
  async init() {
    this.setupDOMElements();
    this.setupEventListeners();
    
    // Check if user is already logged in
    await this.checkCurrentUser();
    
    // Show login modal if no user is logged in
    if (!this.currentUser) {
      this.showLoginModal();
    } else {
      this.updateUserDisplay();
    }
  }
  
  setupDOMElements() {
    this.modal = document.getElementById('user-login-modal');
    this.loginForm = document.getElementById('login-user-form');
    this.registerForm = document.getElementById('create-user-form');
    this.userInfo = document.getElementById('user-info');
    this.userMenu = document.getElementById('user-menu');
    
    // Form containers
    this.loginContainer = document.getElementById('login-form');
    this.registerContainer = document.getElementById('register-form');
  }
  
  setupEventListeners() {
    // Modal close button
    const closeButton = document.querySelector('.modal-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.hideLoginModal());
    }
    
    // Close modal on outside click
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.hideLoginModal();
        }
      });
    }
    
    // Form submissions
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    
    if (this.registerForm) {
      this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
    
    // Form switching buttons
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');
    const guestLoginBtn = document.getElementById('guest-login');
    
    if (showRegisterBtn) {
      showRegisterBtn.addEventListener('click', () => this.showRegisterForm());
    }
    
    if (showLoginBtn) {
      showLoginBtn.addEventListener('click', () => this.showLoginForm());
    }
    
    if (guestLoginBtn) {
      guestLoginBtn.addEventListener('click', () => this.handleGuestLogin());
    }
    
    // User menu buttons
    const userMenuButton = document.getElementById('user-menu-button');
    const switchUserBtn = document.getElementById('switch-user');
    const logoutBtn = document.getElementById('logout-user');
    
    if (userMenuButton) {
      userMenuButton.addEventListener('click', () => this.toggleUserMenu());
    }
    
    if (switchUserBtn) {
      switchUserBtn.addEventListener('click', () => this.switchUser());
    }
    
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
    
    // Close user menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.userMenu && !e.target.closest('#user-info')) {
        this.hideUserMenu();
      }
    });
  }
  
  async checkCurrentUser() {
    try {
      const response = await fetch(`${this.gameApiUrl}/current_user`);
      const data = await response.json();
      
      if (data.user) {
        this.currentUser = data.user;
        return true;
      }
    } catch (error) {
      console.error('Error checking current user:', error);
    }
    
    return false;
  }
  
  async handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const loginData = {
      username: formData.get('username').trim(),
      password: formData.get('password').trim()
    };
    
    try {
      const response = await fetch(`${this.gameApiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.currentUser = data.user;
        this.hideLoginModal();
        this.updateUserDisplay();
        this.showMessage('Login successful!', 'success');
        
        // Trigger game initialization or refresh
        this.onUserLogin();
      } else {
        this.showMessage(data.error || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showMessage('Login failed. Please try again.', 'error');
    }
  }
  
  async handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const registerData = {
      username: formData.get('username').trim(),
      password: formData.get('password').trim()
    };
    
    try {
      const response = await fetch(`${this.gameApiUrl}/create_user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.currentUser = data.user;
        this.hideLoginModal();
        this.updateUserDisplay();
        this.showMessage('Account created successfully!', 'success');
        
        // Trigger game initialization
        this.onUserLogin();
      } else {
        this.showMessage(data.error || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showMessage('Registration failed. Please try again.', 'error');
    }
  }
  
  async handleGuestLogin() {
    try {
      const response = await fetch(`${this.gameApiUrl}/guest_login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.currentUser = data.user;
        this.hideLoginModal();
        this.updateUserDisplay();
        this.showMessage('Playing as guest!', 'success');
        
        // Trigger game initialization
        this.onUserLogin();
      } else {
        this.showMessage(data.error || 'Guest login failed', 'error');
      }
    } catch (error) {
      console.error('Guest login error:', error);
      this.showMessage('Guest login failed. Please try again.', 'error');
    }
  }
  
  async logout() {
    try {
      await fetch(`${this.gameApiUrl}/logout`, {
        method: 'POST'
      });
      
      this.currentUser = null;
      this.updateUserDisplay();
      this.showLoginModal();
      this.showMessage('Logged out successfully!', 'success');
      
      // Clean up any game state
      this.onUserLogout();
    } catch (error) {
      console.error('Logout error:', error);
      this.showMessage('Logout failed', 'error');
    }
  }
  
  switchUser() {
    this.hideUserMenu();
    this.showLoginModal();
  }
  
  showLoginModal() {
    if (this.modal) {
      this.modal.classList.remove('hidden');
      this.modal.setAttribute('aria-hidden', 'false');
      this.showLoginForm();
      
      // Focus first input
      const firstInput = this.modal.querySelector('input[type="text"]');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }
  
  hideLoginModal() {
    if (this.modal) {
      this.modal.classList.add('hidden');
      this.modal.setAttribute('aria-hidden', 'true');
    }
  }
  
  showLoginForm() {
    if (this.loginContainer && this.registerContainer) {
      this.loginContainer.classList.remove('hidden');
      this.registerContainer.classList.add('hidden');
      
      // Clear forms
      if (this.loginForm) this.loginForm.reset();
    }
  }
  
  showRegisterForm() {
    if (this.loginContainer && this.registerContainer) {
      this.loginContainer.classList.add('hidden');
      this.registerContainer.classList.remove('hidden');
      
      // Clear forms
      if (this.registerForm) this.registerForm.reset();
      
      // Focus first input in register form
      const firstInput = this.registerContainer.querySelector('input[type="text"]');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }
  
  updateUserDisplay() {
    const currentUserElement = document.getElementById('current-user');
    
    if (this.currentUser) {
      if (this.userInfo) {
        this.userInfo.classList.remove('hidden');
      }
      
      if (currentUserElement) {
        const displayName = this.currentUser.username.startsWith('guest_') 
          ? 'Guest' 
          : this.currentUser.username;
        currentUserElement.textContent = displayName;
      }
    } else {
      if (this.userInfo) {
        this.userInfo.classList.add('hidden');
      }
    }
  }
  
  toggleUserMenu() {
    if (this.userMenu) {
      this.userMenu.classList.toggle('hidden');
    }
  }
  
  hideUserMenu() {
    if (this.userMenu) {
      this.userMenu.classList.add('hidden');
    }
  }
  
  showMessage(message, type = 'info') {
    // Create or update message element
    let messageElement = document.getElementById('user-message');
    
    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.id = 'user-message';
      messageElement.className = 'user-message';
      document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    messageElement.className = `user-message ${type}`;
    messageElement.classList.remove('hidden');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      messageElement.classList.add('hidden');
    }, 3000);
  }
  
  // Event handlers for game integration
  onUserLogin() {
    // Trigger custom event for game to handle
    document.dispatchEvent(new CustomEvent('userLoggedIn', {
      detail: { user: this.currentUser }
    }));
  }
  
  onUserLogout() {
    // Trigger custom event for game to handle
    document.dispatchEvent(new CustomEvent('userLoggedOut'));
  }
  
  // Getters for other modules
  getCurrentUser() {
    return this.currentUser;
  }
  
  isLoggedIn() {
    return !!this.currentUser;
  }
  
  isGuest() {
    return this.currentUser && this.currentUser.username.startsWith('guest_');
  }
}

// Create global instance
const userManager = new UserManager();

// Export for other modules
window.UserManager = UserManager;
window.userManager = userManager;
