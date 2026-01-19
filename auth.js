import db from './database.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.authListeners = [];
    this.pendingEmail = null;
    this.pendingUsername = null;
  }

  // Initialize auth and check for existing session
  init() {
    // Subscribe to auth state changes
    db.subscribeAuth((auth) => {
      console.log('Auth state changed:', auth);
      if (auth.user) {
        this.currentUser = auth.user;
        this.notifyListeners();
      } else {
        this.currentUser = null;
        this.notifyListeners();
      }
    });
    
    return this.currentUser;
  }

  // Send magic code to email
  async sendMagicCode(email, username = null) {
    try {
      this.pendingEmail = email;
      this.pendingUsername = username;
      console.log('Sending magic code to:', email);
      
      await db.auth.sendMagicCode({ email });
      console.log('Magic code sent successfully');
      return { success: true };
    } catch (error) {
      console.error('Send magic code error:', error);
      return { success: false, error: error.message || error.body?.message || 'Failed to send code' };
    }
  }

  // Verify magic code
  async verifyMagicCode(code) {
    try {
      console.log('Verifying code for email:', this.pendingEmail);
      await db.auth.signInWithMagicCode({ email: this.pendingEmail, code });
      
      // Wait a moment for auth to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If this is a new user and we have a username, store it
      if (this.pendingUsername && this.currentUser) {
        console.log('Storing username for new user:', this.pendingUsername);
        await db.transact([
          db.tx.users[this.currentUser.id].update({ 
            username: this.pendingUsername,
            email: this.pendingEmail,
            createdAt: Date.now()
          })
        ]);
      }
      
      this.pendingEmail = null;
      this.pendingUsername = null;
      return { success: true };
    } catch (error) {
      console.error('Verify code error:', error);
      return { success: false, error: error.message || error.body?.message || 'Invalid code' };
    }
  }

  // Sign out
  async signOut() {
    try {
      db.auth.signOut();
      this.currentUser = null;
      this.notifyListeners();
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Add auth state listener
  onAuthStateChange(callback) {
    this.authListeners.push(callback);
    // Immediately call with current state
    callback(this.currentUser);
  }

  // Notify all listeners of auth state change
  notifyListeners() {
    this.authListeners.forEach(callback => callback(this.currentUser));
  }
}

// Create singleton instance
const authManager = new AuthManager();

export default authManager;
