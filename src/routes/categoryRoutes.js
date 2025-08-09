const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/authMiddleware');
const Category = require('../models/Category');

// Get all categories (public)
router.get('/', async (req, res) => {
  try {
    // For now, return static categories
    const categories = [
      { _id: '1', name: 'Technology', description: 'Tech and IT related events', color: '#3498db', icon: 'computer' },
      { _id: '2', name: 'Business', description: 'Business and entrepreneurship events', color: '#2ecc71', icon: 'business' },
      { _id: '3', name: 'Arts', description: 'Arts and creative events', color: '#e74c3c', icon: 'palette' },
      { _id: '4', name: 'Science', description: 'Science and research events', color: '#9b59b6', icon: 'science' },
      { _id: '5', name: 'Sports', description: 'Sports and fitness events', color: '#f39c12', icon: 'sports_soccer' },
      { _id: '6', name: 'Music', description: 'Music and performance events', color: '#1abc9c', icon: 'music_note' },
      { _id: '7', name: 'Education', description: 'Educational and learning events', color: '#34495e', icon: 'school' },
      { _id: '8', name: 'Health', description: 'Health and wellness events', color: '#e67e22', icon: 'health_and_safety' },
      { _id: '9', name: 'Social', description: 'Social and networking events', color: '#d35400', icon: 'groups' },
      { _id: '10', name: 'Workshop', description: 'Hands-on workshop events', color: '#c0392b', icon: 'build' }
    ];
    
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
});

// Create new category (admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create category', error: error.message });
  }
});

// Update category (admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update category', error: error.message });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete category', error: error.message });
  }
});

module.exports = router;