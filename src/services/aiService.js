const OpenAI = require('openai');

class AIService {
  constructor() {
    // Initialize OpenAI client with API key from environment variables
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Suggest optimal time slots for an event
   */
  async suggestTimeSlot(eventData, existingEvents) {
    try {
      const prompt = `
        Based on the following event details and existing schedule, suggest the best time slot:
        
        Event Type: ${eventData.type}
        Duration: ${eventData.duration} hours
        Target Audience: ${eventData.targetAudience}
        Preferred Days: ${eventData.preferredDays?.join(', ') || 'Any'}
        
        Existing Events:
        ${existingEvents.map(e => `- ${e.title}: ${e.startDate} to ${e.endDate}`).join('\n')}
        
        Consider: academic schedules, meal times, and typical attendance patterns.
        Return a JSON object with: { suggestedTime, reason, alternativeTimes }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI scheduling assistant for an educational institution.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI Time Slot Suggestion Error:', error);
      throw new Error('Failed to generate time slot suggestion');
    }
  }

  /**
   * Predict expected attendance for an event
   */
  async predictAttendance(eventData, historicalData) {
    try {
      const prompt = `
        Predict attendance for this event based on historical data:
        
        Event: ${eventData.title}
        Type: ${eventData.category}
        Date/Time: ${eventData.startDate}
        Location: ${eventData.location.room}
        
        Historical similar events:
        ${historicalData.map(e => `- ${e.title}: ${e.attendees}/${e.capacity} attended`).join('\n')}
        
        Return JSON: { expectedAttendance, confidenceLevel, factors }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI analyst specializing in event attendance prediction.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 300
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Attendance Prediction Error:', error);
      throw new Error('Failed to predict attendance');
    }
  }

  /**
   * Generate personalized event recommendations for a user
   */
  async recommendEvents(userProfile, availableEvents) {
    try {
      const prompt = `
        Recommend events for this user:
        
        User Interests: ${userProfile.interests.join(', ')}
        Department: ${userProfile.department}
        Past Events: ${userProfile.attendedEvents.map(e => e.category).join(', ')}
        
        Available Events:
        ${availableEvents.map(e => `- ${e.title} (${e.category}): ${e.description}`).join('\n')}
        
        Return JSON: { recommendedEvents: [eventIds], reasoning }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI recommendation system for educational events.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 400
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Event Recommendation Error:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  /**
   * Detect scheduling conflicts
   */
  async detectConflicts(newEvent, existingEvents, participants) {
    try {
      const prompt = `
        Check for conflicts with this new event:
        
        New Event: ${newEvent.title}
        Time: ${newEvent.startDate} to ${newEvent.endDate}
        Target Audience: ${newEvent.targetAudience}
        
        Existing Events:
        ${existingEvents.map(e => `- ${e.title}: ${e.startDate} to ${e.endDate}, Audience: ${e.targetAudience}`).join('\n')}
        
        Return JSON: { hasConflicts: boolean, conflicts: [], suggestions: [] }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI conflict detection system for event scheduling.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 400
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Conflict Detection Error:', error);
      throw new Error('Failed to detect conflicts');
    }
  }

  /**
   * Analyze event feedback sentiment
   */
  async analyzeFeedback(feedbackArray) {
    try {
      const prompt = `
        Analyze the sentiment and key themes from this event feedback:
        
        Feedback:
        ${feedbackArray.map((f, i) => `${i + 1}. ${f.comment}`).join('\n')}
        
        Return JSON: { overallSentiment, positiveAspects: [], improvements: [], summary }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI sentiment analysis expert.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 500
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Feedback Analysis Error:', error);
      throw new Error('Failed to analyze feedback');
    }
  }

  /**
   * Auto-categorize an event based on its description
   */
  async categorizeEvent(eventTitle, eventDescription) {
    try {
      const categories = ['Academic', 'Workshop', 'Seminar', 'Social', 'Career', 'Sports', 'Cultural', 'Technical'];
      
      const prompt = `
        Categorize this event:
        Title: ${eventTitle}
        Description: ${eventDescription}
        
        Available categories: ${categories.join(', ')}
        
        Return JSON: { category, confidence, tags: [] }
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI categorization system.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Event Categorization Error:', error);
      throw new Error('Failed to categorize event');
    }
  }
}

module.exports = new AIService();