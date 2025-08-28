# Fancy 2048 - Multi-User System

## 🎯 Overview
The Fancy 2048 game now supports multiple users with individual accounts, separate statistics, and personalized leaderboards. Each user can create an account, login, and have their game progress tracked independently.

## 🚀 Features

### User Management
- **User Registration**: Create accounts with username and optional password
- **User Login**: Secure login with session management
- **Guest Mode**: Play temporarily without creating an account
- **User Switching**: Switch between different user accounts
- **Secure Logout**: Clean session termination

### Data Separation
- **Individual Statistics**: Each user has their own game statistics
- **Personal Leaderboards**: User-specific score tracking
- **Global Leaderboard**: Combined leaderboard showing all users' best scores
- **Grid Size Tracking**: Statistics include grid size for better comparison

### Enhanced Game Features
- **User-Associated Games**: All games are linked to specific users
- **Personalized Experience**: Settings and preferences per user
- **Score Tracking**: Comprehensive scoring system with user attribution

## 🛠 Technical Implementation

### Backend (Flask)
- **User Class**: Manages user data, preferences, and statistics
- **Session Management**: Flask sessions for user authentication
- **API Endpoints**: RESTful endpoints for user operations
- **Data Storage**: In-memory storage (easily adaptable to database)

### Frontend (JavaScript)
- **UserManager Class**: Handles user authentication and UI
- **Modal Interface**: Clean login/registration interface
- **Game Integration**: Seamless integration with existing game logic
- **Responsive Design**: Mobile-friendly user interface

## 📋 API Endpoints

### User Management
- `POST /api/create_user` - Create new user account
- `POST /api/login` - User login
- `POST /api/logout` - User logout  
- `POST /api/guest_login` - Create guest session
- `GET /api/current_user` - Get current user info
- `GET /api/users` - List all users

### Game Data (User-Specific)
- `GET /api/get_stats` - Get user's statistics
- `GET /api/get_leaderboard` - Get user or global leaderboard
- `POST /api/save_stats` - Save statistics for current user
- `POST /api/save_leaderboard` - Save score to user's leaderboard
- `POST /api/reset_stats` - Reset user's statistics
- `POST /api/reset_leaderboard` - Reset user's leaderboard

## 💻 Usage

### Starting the Application
```bash
python3 app.py
```

### User Flow
1. **First Visit**: Users see a welcome modal with login options
2. **Account Creation**: New users can create accounts with optional passwords
3. **Login**: Existing users can login with their credentials
4. **Guest Mode**: Users can play immediately without registration
5. **Gaming**: All game progress is automatically saved to their account
6. **Statistics**: Users can view their personal statistics and leaderboards

### User Interface
- **Header Display**: Shows current user and provides user menu
- **User Menu**: Access to logout, switch user, and account options
- **Modal System**: Clean, accessible login/registration interface
- **Responsive Design**: Works on desktop and mobile devices

## 🎮 Game Integration

### Automatic Association
- All games are automatically associated with the logged-in user
- Statistics are saved separately for each user
- Leaderboards are maintained per user with global view available

### Enhanced Statistics
- Grid size tracking for better comparison
- Time-based statistics with user attribution
- Export functionality includes user information

## 🔧 Customization

### User Preferences
Users can have personalized settings:
- Theme preferences (dark/light mode)
- Default grid size
- Color hue preferences

### Data Storage
The system uses in-memory storage but is designed to easily adapt to:
- SQLite database
- PostgreSQL/MySQL
- MongoDB
- File-based storage

## 🛡 Security

### Basic Security Features
- Password hashing using SHA-256
- Session-based authentication
- Input validation and sanitization
- Protected API endpoints

### Production Considerations
For production deployment, consider:
- Stronger password hashing (bcrypt/scrypt)
- HTTPS enforcement
- Rate limiting
- Database security
- User data encryption

## 🎉 Benefits

### For Players
- **Personal Progress**: Track individual improvement
- **Competition**: Compare scores with other users
- **Persistence**: Never lose game progress
- **Customization**: Personalized gaming experience

### For Developers
- **Scalable**: Easy to add more users and features
- **Maintainable**: Clean separation of user and game logic
- **Extensible**: Simple to add new user-specific features
- **Modern**: Uses current web development best practices

## 📈 Future Enhancements

Potential improvements:
- User profiles with avatars
- Friend systems and social features
- Tournaments and challenges
- Achievement systems
- Data analytics and insights
- Mobile app integration

---

**Now multiple users can enjoy Fancy 2048 with their own personalized experience!** 🎮✨
