// Mock authentication controller for demo without database
const jwt = require('jsonwebtoken');

// Mock users data
const mockUsers = [
  {
    _id: '1',
    email: 'admin@test.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    department: 'Administration',
    isActive: true
  },
  {
    _id: '2',
    email: 'teacher@test.com',
    password: 'teacher123',
    firstName: 'John',
    lastName: 'Teacher',
    role: 'teacher',
    department: 'Computer Science',
    isActive: true
  },
  {
    _id: '3',
    email: 'student@test.com',
    password: 'student123',
    firstName: 'Jane',
    lastName: 'Student',
    role: 'student',
    department: 'Computer Science',
    studentId: 'STU001',
    isActive: true
  }
];

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      _id: user._id, 
      email: user.email, 
      role: user.role,
      fullName: `${user.firstName} ${user.lastName}`
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Mock login
exports.mockLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user in mock data
    const user = mockUsers.find(u => u.email === email && u.password === password);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Generate token
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          role: user.role,
          department: user.department
        },
        token,
        refreshToken: token // Using same token for simplicity
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during login',
      error: error.message 
    });
  }
};

// Mock register
exports.mockRegister = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, department, studentId } = req.body;

    // Check if user exists
    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Create new user
    const newUser = {
      _id: String(mockUsers.length + 1),
      email,
      password,
      firstName,
      lastName,
      role: role || 'student',
      department,
      studentId,
      isActive: true
    };

    mockUsers.push(newUser);

    // Generate token
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          _id: newUser._id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          fullName: `${newUser.firstName} ${newUser.lastName}`,
          role: newUser.role,
          department: newUser.department
        },
        token,
        refreshToken: token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error registering user',
      error: error.message 
    });
  }
};

// Mock profile
exports.mockGetProfile = async (req, res) => {
  try {
    const user = mockUsers.find(u => u._id === req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        role: user.role,
        department: user.department,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching profile',
      error: error.message 
    });
  }
};