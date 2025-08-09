# Event Management Backend

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
- Copy `.env.example` to `.env`
- Update MongoDB URI and other settings

3. Setup database:
```bash
node src/scripts/setupDatabase.js
```

4. Start the server:
```bash
npm start
```

## Default Login Credentials

After running the setup script, you can login with:

- **Admin Account:**
  - Email: admin@test.com
  - Password: admin123

- **Teacher Account:**
  - Email: teacher@test.com
  - Password: teacher123

- **Student Account:**
  - Email: student@test.com
  - Password: student123

## API Documentation

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- POST `/api/auth/refresh-token` - Refresh JWT token
- GET `/api/auth/profile` - Get current user profile
- PUT `/api/auth/profile` - Update profile
- POST `/api/auth/change-password` - Change password

### Events
- GET `/api/events` - Get all events
- GET `/api/events/:id` - Get single event
- POST `/api/events` - Create new event (Teacher/Admin)
- PUT `/api/events/:id` - Update event
- DELETE `/api/events/:id` - Delete event
- GET `/api/events/my/events` - Get user's events
- POST `/api/events/:id/register` - Register for event
- DELETE `/api/events/:id/unregister` - Unregister from event
- POST `/api/events/:id/feedback` - Submit feedback

### AI Features
- POST `/api/ai/suggest-timeslot` - Get AI time suggestions
- POST `/api/ai/predict-attendance` - Predict event attendance
- POST `/api/ai/conflict-check` - Check for scheduling conflicts
- POST `/api/ai/categorize` - Auto-categorize event
- GET `/api/ai/recommendations` - Get event recommendations

## Features

- JWT Authentication with refresh tokens
- Role-based access control (Admin, Teacher, Student)
- MongoDB database with Mongoose ODM
- Real-time notifications with Socket.io
- OpenAI integration for smart features
- Rate limiting and security headers
- Error handling and validation"# PROJETPI" 
"# PROJETPI" 
