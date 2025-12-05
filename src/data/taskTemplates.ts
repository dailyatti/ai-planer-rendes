export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: 'work' | 'personal' | 'health' | 'creative' | 'learning';
  tasks: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    estimatedTime?: number; // in minutes
  }[];
  icon: string;
}

export const taskTemplates: TaskTemplate[] = [
  {
    id: 'blog-post',
    name: 'Blog Post Creation',
    description: 'Complete workflow for creating and publishing a blog post',
    category: 'creative',
    icon: '📝',
    tasks: [
      {
        title: 'Research topic and keywords',
        description: 'Find relevant keywords and research the topic thoroughly',
        priority: 'high',
        estimatedTime: 60,
      },
      {
        title: 'Create outline',
        description: 'Structure the blog post with main points and subheadings',
        priority: 'high',
        estimatedTime: 30,
      },
      {
        title: 'Write first draft',
        description: 'Write the complete first draft without editing',
        priority: 'high',
        estimatedTime: 120,
      },
      {
        title: 'Edit and proofread',
        description: 'Review, edit, and polish the content',
        priority: 'medium',
        estimatedTime: 45,
      },
      {
        title: 'Add images and formatting',
        description: 'Insert relevant images and format the post',
        priority: 'medium',
        estimatedTime: 30,
      },
      {
        title: 'SEO optimization',
        description: 'Optimize meta description, title, and keywords',
        priority: 'medium',
        estimatedTime: 20,
      },
      {
        title: 'Publish and promote',
        description: 'Publish the post and share on social media',
        priority: 'low',
        estimatedTime: 15,
      },
    ],
  },
  {
    id: 'morning-routine',
    name: 'Morning Routine',
    description: 'Start your day with a productive morning routine',
    category: 'personal',
    icon: '☀️',
    tasks: [
      {
        title: 'Wake up and hydrate',
        description: 'Drink a glass of water',
        priority: 'high',
        estimatedTime: 5,
      },
      {
        title: 'Morning exercise',
        description: 'Light stretching or workout',
        priority: 'high',
        estimatedTime: 20,
      },
      {
        title: 'Shower and get ready',
        description: 'Personal hygiene and grooming',
        priority: 'high',
        estimatedTime: 30,
      },
      {
        title: 'Healthy breakfast',
        description: 'Prepare and eat a nutritious breakfast',
        priority: 'medium',
        estimatedTime: 20,
      },
      {
        title: 'Review daily goals',
        description: 'Check planner and set priorities for the day',
        priority: 'high',
        estimatedTime: 10,
      },
    ],
  },
  {
    id: 'weekly-review',
    name: 'Weekly Review',
    description: 'Reflect on the past week and plan for the next',
    category: 'work',
    icon: '📊',
    tasks: [
      {
        title: 'Review completed tasks',
        description: 'Go through all completed tasks from the week',
        priority: 'high',
        estimatedTime: 20,
      },
      {
        title: 'Analyze productivity',
        description: 'Review statistics and identify patterns',
        priority: 'medium',
        estimatedTime: 15,
      },
      {
        title: 'Update goals progress',
        description: 'Check progress on long-term goals',
        priority: 'high',
        estimatedTime: 15,
      },
      {
        title: 'Plan next week',
        description: 'Schedule important tasks for the upcoming week',
        priority: 'high',
        estimatedTime: 30,
      },
      {
        title: 'Clean up and organize',
        description: 'Archive old notes and organize workspace',
        priority: 'low',
        estimatedTime: 20,
      },
    ],
  },
  {
    id: 'workout-plan',
    name: 'Full Body Workout',
    description: 'Complete full body workout routine',
    category: 'health',
    icon: '💪',
    tasks: [
      {
        title: 'Warm-up',
        description: '5-10 minutes of light cardio and dynamic stretching',
        priority: 'high',
        estimatedTime: 10,
      },
      {
        title: 'Upper body exercises',
        description: 'Push-ups, pull-ups, shoulder press',
        priority: 'high',
        estimatedTime: 20,
      },
      {
        title: 'Lower body exercises',
        description: 'Squats, lunges, calf raises',
        priority: 'high',
        estimatedTime: 20,
      },
      {
        title: 'Core workout',
        description: 'Planks, crunches, leg raises',
        priority: 'medium',
        estimatedTime: 15,
      },
      {
        title: 'Cool down and stretch',
        description: 'Static stretching and breathing exercises',
        priority: 'high',
        estimatedTime: 10,
      },
    ],
  },
  {
    id: 'learn-new-skill',
    name: 'Learn New Skill',
    description: 'Structured approach to learning something new',
    category: 'learning',
    icon: '🎓',
    tasks: [
      {
        title: 'Define learning goals',
        description: 'Clearly define what you want to learn and why',
        priority: 'high',
        estimatedTime: 15,
      },
      {
        title: 'Find quality resources',
        description: 'Research and gather books, courses, tutorials',
        priority: 'high',
        estimatedTime: 30,
      },
      {
        title: 'Create study schedule',
        description: 'Plan dedicated time slots for learning',
        priority: 'medium',
        estimatedTime: 20,
      },
      {
        title: 'Practice daily',
        description: 'Dedicate time to hands-on practice',
        priority: 'high',
        estimatedTime: 60,
      },
      {
        title: 'Take notes and review',
        description: 'Document key learnings and review regularly',
        priority: 'medium',
        estimatedTime: 30,
      },
      {
        title: 'Build a project',
        description: 'Apply knowledge by creating something practical',
        priority: 'high',
        estimatedTime: 180,
      },
    ],
  },
  {
    id: 'video-production',
    name: 'Video Production',
    description: 'Complete workflow for creating a video',
    category: 'creative',
    icon: '🎬',
    tasks: [
      {
        title: 'Brainstorm and script',
        description: 'Develop concept and write script',
        priority: 'high',
        estimatedTime: 90,
      },
      {
        title: 'Plan shots and storyboard',
        description: 'Create shot list and visual storyboard',
        priority: 'high',
        estimatedTime: 60,
      },
      {
        title: 'Record footage',
        description: 'Film all required scenes',
        priority: 'high',
        estimatedTime: 180,
      },
      {
        title: 'Edit video',
        description: 'Cut, arrange, and edit footage',
        priority: 'high',
        estimatedTime: 240,
      },
      {
        title: 'Add music and effects',
        description: 'Include background music, transitions, effects',
        priority: 'medium',
        estimatedTime: 60,
      },
      {
        title: 'Create thumbnail',
        description: 'Design eye-catching thumbnail',
        priority: 'medium',
        estimatedTime: 30,
      },
      {
        title: 'Upload and optimize',
        description: 'Upload, add description, tags, and publish',
        priority: 'low',
        estimatedTime: 20,
      },
    ],
  },
  {
    id: 'deep-work-session',
    name: 'Deep Work Session',
    description: 'Focused work session for important tasks',
    category: 'work',
    icon: '🎯',
    tasks: [
      {
        title: 'Eliminate distractions',
        description: 'Turn off notifications, close unnecessary apps',
        priority: 'high',
        estimatedTime: 5,
      },
      {
        title: 'Set clear objective',
        description: 'Define exactly what you want to accomplish',
        priority: 'high',
        estimatedTime: 5,
      },
      {
        title: 'Work block 1',
        description: 'First 50-minute focused work session',
        priority: 'high',
        estimatedTime: 50,
      },
      {
        title: 'Short break',
        description: 'Take a 10-minute break',
        priority: 'medium',
        estimatedTime: 10,
      },
      {
        title: 'Work block 2',
        description: 'Second 50-minute focused work session',
        priority: 'high',
        estimatedTime: 50,
      },
      {
        title: 'Review and document',
        description: 'Review progress and document key insights',
        priority: 'medium',
        estimatedTime: 15,
      },
    ],
  },
  {
    id: 'meal-prep',
    name: 'Weekly Meal Prep',
    description: 'Prepare healthy meals for the week',
    category: 'health',
    icon: '🍱',
    tasks: [
      {
        title: 'Plan meals',
        description: 'Choose recipes and create meal plan',
        priority: 'high',
        estimatedTime: 30,
      },
      {
        title: 'Create shopping list',
        description: 'List all ingredients needed',
        priority: 'high',
        estimatedTime: 15,
      },
      {
        title: 'Grocery shopping',
        description: 'Buy all ingredients',
        priority: 'high',
        estimatedTime: 60,
      },
      {
        title: 'Prep vegetables',
        description: 'Wash, chop, and portion vegetables',
        priority: 'medium',
        estimatedTime: 45,
      },
      {
        title: 'Cook proteins',
        description: 'Prepare and cook meat, fish, or plant proteins',
        priority: 'high',
        estimatedTime: 60,
      },
      {
        title: 'Portion and store',
        description: 'Divide into containers and refrigerate',
        priority: 'medium',
        estimatedTime: 30,
      },
    ],
  },
];

