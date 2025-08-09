const Event = require('../models/Event');
const Category = require('../models/Category');
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Fallback mock responses (used if OpenAI fails)
const mockAIResponses = {
  categoryHelp: [
    "Based on your event history, I suggest creating a 'Hackathon' category for competitive programming events.",
    "Consider adding a 'Guest Lecture' category to differentiate from regular seminars.",
    "A 'Student Club' category would help organize student-led initiatives better.",
    "You might want to create a 'Virtual Events' category for online-only events.",
    "Adding a 'Certification' category could help track professional development events."
  ],
  
  categoryAnalysis: [
    "Your 'Workshop' category has the highest engagement with 85% attendance rate.",
    "Events in the 'Academic' category typically need 2-3 weeks advance notice for best attendance.",
    "The 'Social' category events perform best on Friday afternoons.",
    "Consider merging 'Seminar' and 'Guest Lecture' categories as they have similar attendance patterns.",
    "Your 'Technical' category could benefit from more hands-on practical sessions."
  ],
  
  eventSuggestions: [
    "Based on current trends, consider adding more AI/ML workshops to the Technical category.",
    "Student feedback suggests more career-oriented events in the Professional Development category.",
    "The Academic category could use more interdisciplinary collaboration events.",
    "Social events with food tend to have 40% higher attendance.",
    "Technical workshops on weekends have better completion rates."
  ]
};

// Chat with AI assistant
exports.chat = async (req, res) => {
  try {
    const { message, context } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let response = '';
    
    // Try to use OpenAI first
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      try {
        // Build context-aware system prompt
        let systemPrompt = "You are an AI assistant for an event management system. Format your responses using markdown: use **bold** for emphasis, numbered lists for multiple items, bullet points where appropriate, and clear line breaks between sections. ";
        
        if (context === 'categories') {
          systemPrompt += "You are helping an administrator manage event categories. Focus on providing suggestions for category management, analyzing category performance, and recommending improvements. Keep responses concise and actionable.";
        } else if (context === 'events') {
          systemPrompt += "You are helping with event planning and management. Provide insights about scheduling, attendance, and event optimization. When listing events, format them clearly with event name, date, time, location, and registration info.";
        } else {
          systemPrompt += "Help users navigate the system and provide general assistance.";
        }
        
        // Get comprehensive context from database
        let additionalContext = '';
        
        if (context === 'categories') {
          // Get category-specific context
          const categoryCount = await Category.countDocuments();
          const eventCount = await Event.countDocuments();
          const categories = await Category.find().select('name eventCount isActive');
          
          additionalContext = `\n\nCurrent system stats:
- Total categories: ${categoryCount}
- Active categories: ${categories.filter(c => c.isActive).length}
- Total events: ${eventCount}
- Categories breakdown: ${categories.map(c => `${c.name} (${c.eventCount} events, ${c.isActive ? 'active' : 'inactive'})`).join(', ')}`;
          
        } else if (context === 'events') {
          // Get event-specific context
          const now = new Date();
          const upcomingEvents = await Event.find({
            startDate: { $gte: now },
            status: 'approved'
          })
          .select('title startDate endDate category location.room location.building maxParticipants registrations')
          .sort('startDate')
          .limit(10);
          
          const pastEvents = await Event.find({
            endDate: { $lt: now },
            status: 'approved'
          })
          .select('title category registrations maxParticipants')
          .sort('-endDate')
          .limit(5);
          
          // If user is a teacher, get their specific events
          let userEvents = [];
          if (userRole === 'teacher') {
            userEvents = await Event.find({ 
              organizer: userId 
            })
            .select('title status startDate category registrations')
            .sort('-createdAt')
            .limit(5);
          }
          
          additionalContext = `\n\nEvent context:
          
Upcoming Events (next 10):
${upcomingEvents.map((e, i) => `${i + 1}. **${e.title}** (${e.category})
   - Date: ${new Date(e.startDate).toLocaleDateString()}
   - Time: ${new Date(e.startDate).toLocaleTimeString()}
   - Location: ${e.location.room}, ${e.location.building}
   - Registrations: ${e.registrations?.length || 0}/${e.maxParticipants}`).join('\n\n')}

Recent Past Events (for reference):
${pastEvents.map(e => `- **${e.title}** (${e.category}): ${e.registrations?.length || 0}/${e.maxParticipants} attended`).join('\n')}

${userRole === 'teacher' && userEvents.length > 0 ? `\nYour Recent Events:\n${userEvents.map(e => `- **${e.title}** (${e.status}) on ${new Date(e.startDate).toLocaleDateString()}, ${e.registrations?.length || 0} registrations`).join('\n')}` : ''}

Current date/time: ${now.toLocaleString()}
User role: ${userRole}`;
          
        } else {
          // General context
          const now = new Date();
          const eventCount = await Event.countDocuments({ status: 'approved' });
          const userCount = await require('../models/User').countDocuments();
          const upcomingCount = await Event.countDocuments({
            startDate: { $gte: now },
            status: 'approved'
          });
          
          additionalContext = `\n\nSystem overview:
- Total events: ${eventCount}
- Upcoming events: ${upcomingCount}
- Total users: ${userCount}
- Current date/time: ${now.toLocaleString()}
- User role: ${userRole}`;
        }
        
        // Handle specific queries about events
        let eventSpecificData = '';
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('today') || lowerMessage.includes('tomorrow') || lowerMessage.includes('this week')) {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          
          let endDate = new Date();
          if (lowerMessage.includes('today')) {
            endDate.setHours(23, 59, 59, 999);
          } else if (lowerMessage.includes('tomorrow')) {
            startOfDay.setDate(startOfDay.getDate() + 1);
            endDate = new Date(startOfDay);
            endDate.setHours(23, 59, 59, 999);
          } else if (lowerMessage.includes('this week')) {
            endDate.setDate(endDate.getDate() + 7);
          }
          
          const relevantEvents = await Event.find({
            startDate: { $gte: startOfDay, $lte: endDate },
            status: 'approved'
          }).select('title startDate location.room category');
          
          if (relevantEvents.length > 0) {
            eventSpecificData = `\n\nRelevant events for your query:\n${relevantEvents.map(e => `- ${e.title} (${e.category}) on ${new Date(e.startDate).toLocaleString()} in ${e.location.room}`).join('\n')}`;
          }
        }
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: systemPrompt + additionalContext + eventSpecificData 
            },
            { 
              role: 'user', 
              content: message 
            }
          ],
          temperature: 0.7,
          max_tokens: 400
        });
        
        response = completion.choices[0].message.content;
      } catch (openaiError) {
        console.error('OpenAI API Error:', openaiError.message);
        // Fall back to mock responses
        response = getMockResponse(message.toLowerCase());
      }
    } else {
      // Use mock responses if no API key
      response = getMockResponse(message.toLowerCase());
    }
    
    res.json({
      success: true,
      data: {
        response,
        timestamp: new Date(),
        context
      }
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI request',
      error: error.message
    });
  }
};

// Helper function for mock responses
function getMockResponse(lowerMessage) {
  if (lowerMessage.includes('category') && (lowerMessage.includes('suggest') || lowerMessage.includes('create') || lowerMessage.includes('add'))) {
    return mockAIResponses.categoryHelp[Math.floor(Math.random() * mockAIResponses.categoryHelp.length)];
  } else if (lowerMessage.includes('analyze') || lowerMessage.includes('analysis') || lowerMessage.includes('performance')) {
    return mockAIResponses.categoryAnalysis[Math.floor(Math.random() * mockAIResponses.categoryAnalysis.length)];
  } else if (lowerMessage.includes('event') && (lowerMessage.includes('suggest') || lowerMessage.includes('idea'))) {
    return mockAIResponses.eventSuggestions[Math.floor(Math.random() * mockAIResponses.eventSuggestions.length)];
  } else if (lowerMessage.includes('help')) {
    return "I can help you with:\n1. Suggesting new event categories\n2. Analyzing category performance\n3. Recommending events for each category\n4. Optimizing category structure\n\nWhat would you like to know?";
  } else {
    return "I can help you manage event categories more effectively. Try asking about category suggestions, performance analysis, or event ideas for specific categories.";
  }
}

// Get category suggestions
exports.suggestCategories = async (req, res) => {
  try {
    const existingCategories = await Category.find().select('name');
    const existingNames = existingCategories.map(c => c.name);
    
    // Suggest categories not already in the system
    const allSuggestions = [
      { name: 'Hackathon', description: 'Competitive programming and innovation events', icon: 'code', color: '#FF6B6B' },
      { name: 'Guest Lecture', description: 'Talks by external speakers and industry experts', icon: 'mic', color: '#4ECDC4' },
      { name: 'Certification', description: 'Professional certification and training programs', icon: 'verified', color: '#45B7D1' },
      { name: 'Virtual', description: 'Online-only events and webinars', icon: 'video_call', color: '#96CEB4' },
      { name: 'Research', description: 'Research presentations and academic discussions', icon: 'science', color: '#FFEAA7' },
      { name: 'Networking', description: 'Professional networking and meetup events', icon: 'groups', color: '#DDA0DD' },
      { name: 'Competition', description: 'Academic and skill-based competitions', icon: 'emoji_events', color: '#FFB6C1' },
      { name: 'Exhibition', description: 'Art, science, and project exhibitions', icon: 'museum', color: '#87CEEB' }
    ];
    
    const suggestions = allSuggestions.filter(s => !existingNames.includes(s.name));
    
    res.json({
      success: true,
      data: {
        suggestions,
        reasoning: 'These categories are commonly used in educational institutions and could help better organize your events.'
      }
    });
  } catch (error) {
    console.error('Category Suggestion Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate category suggestions',
      error: error.message
    });
  }
};

// Analyze category performance
exports.analyzeCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    const analysis = [];
    
    for (const category of categories) {
      const events = await Event.find({ category: category.name });
      const totalEvents = events.length;
      const approvedEvents = events.filter(e => e.status === 'approved').length;
      const avgRegistrations = events.reduce((acc, e) => acc + (e.registrations?.length || 0), 0) / (totalEvents || 1);
      
      analysis.push({
        category: category.name,
        metrics: {
          totalEvents,
          approvedEvents,
          avgRegistrations: Math.round(avgRegistrations),
          approvalRate: totalEvents > 0 ? ((approvedEvents / totalEvents) * 100).toFixed(1) + '%' : '0%'
        },
        insights: generateCategoryInsights(category.name, totalEvents, avgRegistrations),
        recommendations: generateCategoryRecommendations(category.name, totalEvents, avgRegistrations)
      });
    }
    
    res.json({
      success: true,
      data: {
        analysis,
        summary: generateOverallSummary(analysis)
      }
    });
  } catch (error) {
    console.error('Category Analysis Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze categories',
      error: error.message
    });
  }
};

// Helper functions for generating insights
function generateCategoryInsights(categoryName, eventCount, avgRegistrations) {
  const insights = [];
  
  if (eventCount > 10) {
    insights.push(`High activity category with ${eventCount} events`);
  } else if (eventCount < 3) {
    insights.push('Underutilized category - consider promotion or consolidation');
  }
  
  if (avgRegistrations > 50) {
    insights.push('Very popular category with high engagement');
  } else if (avgRegistrations < 10) {
    insights.push('Low engagement - consider improving event marketing');
  }
  
  return insights;
}

function generateCategoryRecommendations(categoryName, eventCount, avgRegistrations) {
  const recommendations = [];
  
  if (eventCount === 0) {
    recommendations.push('Schedule your first event in this category');
  } else if (avgRegistrations < 20) {
    recommendations.push('Focus on improving event descriptions and marketing');
    recommendations.push('Consider partnering with student organizations');
  } else {
    recommendations.push('Maintain current momentum');
    recommendations.push('Consider increasing event frequency');
  }
  
  return recommendations;
}

function generateOverallSummary(analysis) {
  const totalCategories = analysis.length;
  const activeCategories = analysis.filter(a => a.metrics.totalEvents > 0).length;
  const avgEventsPerCategory = analysis.reduce((acc, a) => acc + a.metrics.totalEvents, 0) / totalCategories;
  
  return {
    totalCategories,
    activeCategories,
    inactiveCategories: totalCategories - activeCategories,
    avgEventsPerCategory: avgEventsPerCategory.toFixed(1),
    recommendation: avgEventsPerCategory < 5 
      ? 'Consider consolidating categories or increasing event creation'
      : 'Good category distribution - maintain current structure'
  };
}