import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function TaskManagerTutorial() {
  const router = useRouter();
  const [currentLesson, setCurrentLesson] = useState(0);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [showCode, setShowCode] = useState(true);
  const [achievements, setAchievements] = useState([]);

  // Load progress
  useEffect(() => {
    const saved = localStorage.getItem('tutorial_task_manager_progress');
    if (saved) {
      const data = JSON.parse(saved);
      setCurrentLesson(data.currentLesson || 0);
      setCompletedLessons(data.completedLessons || []);
      setAchievements(data.achievements || []);
    }
  }, []);

  // Save progress
  useEffect(() => {
    const data = {
      currentLesson,
      completedLessons,
      achievements,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem('tutorial_task_manager_progress', JSON.stringify(data));
  }, [currentLesson, completedLessons, achievements]);

  const lessons = [
    {
      id: 0,
      phase: 'Planning',
      title: '📋 Planning Your Task Manager SaaS',
      duration: '5 mins',
      objectives: [
        'Define core features and user flows',
        'Design the database schema',
        'Plan the page structure',
        'Identify API endpoints needed',
      ],
      content: `
        <h3>Welcome to Building a Task Management SaaS!</h3>
        <p>In this tutorial, we'll build a complete task management application from scratch. By the end, you'll have:</p>
        <ul>
          <li>✅ A beautiful landing page with pricing</li>
          <li>✅ User authentication and accounts</li>
          <li>✅ Task creation, editing, and management</li>
          <li>✅ Subscription plans (Free, Pro, Enterprise)</li>
          <li>✅ Analytics and insights dashboard</li>
          <li>✅ Email notifications</li>
        </ul>

        <h4>Core Features We'll Build:</h4>
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">📝</div>
            <h5>Task Management</h5>
            <p>Create, edit, delete, and organize tasks with tags and priorities</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">👥</div>
            <h5>Team Collaboration</h5>
            <p>Assign tasks to team members and track progress</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h5>Analytics</h5>
            <p>Visualize productivity with charts and insights</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔔</div>
            <h5>Notifications</h5>
            <p>Email and in-app notifications for task updates</p>
          </div>
        </div>

        <h4>Our Database Schema:</h4>
        <pre><code>
Tasks Table:
- id (PRIMARY KEY)
- title (TEXT)
- description (TEXT)
- status (TEXT: pending, in_progress, completed)
- priority (TEXT: low, medium, high)
- assigned_to (INTEGER - user_id)
- created_by (INTEGER - user_id)
- due_date (DATETIME)
- tags (TEXT - JSON array)
- created_at (DATETIME)
- updated_at (DATETIME)

Projects Table:
- id (PRIMARY KEY)
- name (TEXT)
- description (TEXT)
- owner_id (INTEGER)
- team_members (TEXT - JSON array)
- created_at (DATETIME)

Comments Table:
- id (PRIMARY KEY)
- task_id (INTEGER)
- user_id (INTEGER)
- comment (TEXT)
- created_at (DATETIME)
        </code></pre>

        <div class="pro-tip">
          <strong>💡 Pro Tip:</strong> Start simple! We'll build the MVP first, then add advanced features incrementally.
        </div>
      `,
      action: {
        label: 'View Database Schema',
        link: '/admin/database',
      },
    },
    {
      id: 1,
      phase: 'Planning',
      title: '🎨 Designing the User Experience',
      duration: '5 mins',
      objectives: [
        'Sketch user interface layouts',
        'Plan navigation and user flows',
        'Design responsive breakpoints',
        'Choose color scheme and branding',
      ],
      content: `
        <h3>Designing Your Task Manager UI</h3>
        <p>Great SaaS products start with great design. Let's plan our pages and user flows.</p>

        <h4>Pages We'll Create:</h4>
        <ol>
          <li><strong>Landing Page</strong> - Marketing page with features, pricing, and CTA</li>
          <li><strong>Customer Login</strong> - Authentication page</li>
          <li><strong>Dashboard</strong> - Main task overview</li>
          <li><strong>Tasks Page</strong> - Detailed task management</li>
          <li><strong>Projects Page</strong> - Project organization</li>
          <li><strong>Analytics</strong> - Productivity insights</li>
          <li><strong>Settings</strong> - User preferences and subscription</li>
        </ol>

        <h4>User Flow:</h4>
        <div class="flow-diagram">
          Landing Page → Sign Up → Choose Plan → Dashboard → Create Tasks → Manage & Collaborate
        </div>

        <h4>Design Principles:</h4>
        <ul>
          <li>✨ <strong>Clean & Minimal:</strong> Focus on tasks, not clutter</li>
          <li>🎨 <strong>Brand Colors:</strong> Blue (trust), Green (productivity), White (clarity)</li>
          <li>📱 <strong>Mobile-First:</strong> Responsive design for all devices</li>
          <li>⚡ <strong>Fast & Snappy:</strong> Instant feedback on all actions</li>
        </ul>

        <h4>Wireframe Example - Dashboard:</h4>
        <pre><code>
┌─────────────────────────────────────────┐
│ TaskFlow Logo    Search    Profile     │
├─────────────────────────────────────────┤
│                                          │
│ Today's Tasks (5)    [+ New Task]      │
│                                          │
│ ☐ Review pull requests     High   🔴   │
│ ☐ Update documentation     Med    🟡   │
│ ☑ Team standup meeting     Low    🟢   │
│                                          │
│ ─────────────────────────────────────  │
│                                          │
│ This Week (15)                          │
│ Progress: ████████░░ 80%                │
│                                          │
└─────────────────────────────────────────┘
        </code></pre>

        <div class="pro-tip">
          <strong>💡 Pro Tip:</strong> Use our AI-powered page generator to create these layouts quickly, then customize!
        </div>
      `,
      action: {
        label: 'Start Designing Pages',
        link: '/admin/pages/new',
      },
    },
    {
      id: 2,
      phase: 'Building',
      title: '🏗️ Step 1: Create the Landing Page',
      duration: '10 mins',
      objectives: [
        'Build hero section with value proposition',
        'Add features showcase section',
        'Create pricing table with 3 plans',
        'Add call-to-action and signup form',
      ],
      content: `
        <h3>Building Your Landing Page</h3>
        <p>The landing page is where you convert visitors into customers. Let's make it compelling!</p>

        <h4>Landing Page Sections:</h4>

        <div class="section-breakdown">
          <div class="section">
            <h5>1. Hero Section</h5>
            <pre><code class="language-html">&lt;section class="hero"&gt;
  &lt;h1&gt;Organize Your Work, Amplify Your Productivity&lt;/h1&gt;
  &lt;p&gt;TaskFlow helps teams manage tasks, track progress, and achieve goals together.&lt;/p&gt;
  &lt;button&gt;Start Free Trial&lt;/button&gt;
  &lt;img src="dashboard-preview.png" alt="Dashboard Preview" /&gt;
&lt;/section&gt;</code></pre>
          </div>

          <div class="section">
            <h5>2. Features Grid</h5>
            <pre><code class="language-html">&lt;section class="features"&gt;
  &lt;div class="feature"&gt;
    &lt;div class="icon"&gt;📝&lt;/div&gt;
    &lt;h3&gt;Smart Task Management&lt;/h3&gt;
    &lt;p&gt;Create, assign, and track tasks with ease&lt;/p&gt;
  &lt;/div&gt;
  &lt;div class="feature"&gt;
    &lt;div class="icon"&gt;👥&lt;/div&gt;
    &lt;h3&gt;Team Collaboration&lt;/h3&gt;
    &lt;p&gt;Work together seamlessly in real-time&lt;/p&gt;
  &lt;/div&gt;
  &lt;div class="feature"&gt;
    &lt;div class="icon"&gt;📊&lt;/div&gt;
    &lt;h3&gt;Powerful Analytics&lt;/h3&gt;
    &lt;p&gt;Insights to boost productivity&lt;/p&gt;
  &lt;/div&gt;
&lt;/section&gt;</code></pre>
          </div>

          <div class="section">
            <h5>3. Pricing Table</h5>
            <pre><code class="language-html">&lt;section class="pricing"&gt;
  &lt;div class="plan"&gt;
    &lt;h3&gt;Free&lt;/h3&gt;
    &lt;div class="price"&gt;$0&lt;span&gt;/month&lt;/span&gt;&lt;/div&gt;
    &lt;ul&gt;
      &lt;li&gt;✓ Up to 10 tasks&lt;/li&gt;
      &lt;li&gt;✓ 1 project&lt;/li&gt;
      &lt;li&gt;✓ Basic analytics&lt;/li&gt;
    &lt;/ul&gt;
    &lt;button&gt;Get Started&lt;/button&gt;
  &lt;/div&gt;

  &lt;div class="plan featured"&gt;
    &lt;h3&gt;Pro&lt;/h3&gt;
    &lt;div class="price"&gt;$19&lt;span&gt;/month&lt;/span&gt;&lt;/div&gt;
    &lt;ul&gt;
      &lt;li&gt;✓ Unlimited tasks&lt;/li&gt;
      &lt;li&gt;✓ Unlimited projects&lt;/li&gt;
      &lt;li&gt;✓ Advanced analytics&lt;/li&gt;
      &lt;li&gt;✓ Priority support&lt;/li&gt;
    &lt;/ul&gt;
    &lt;button&gt;Start Free Trial&lt;/button&gt;
  &lt;/div&gt;

  &lt;div class="plan"&gt;
    &lt;h3&gt;Enterprise&lt;/h3&gt;
    &lt;div class="price"&gt;$99&lt;span&gt;/month&lt;/span&gt;&lt;/div&gt;
    &lt;ul&gt;
      &lt;li&gt;✓ Everything in Pro&lt;/li&gt;
      &lt;li&gt;✓ Unlimited team members&lt;/li&gt;
      &lt;li&gt;✓ Custom integrations&lt;/li&gt;
      &lt;li&gt;✓ Dedicated support&lt;/li&gt;
    &lt;/ul&gt;
    &lt;button&gt;Contact Sales&lt;/button&gt;
  &lt;/div&gt;
&lt;/section&gt;</code></pre>
          </div>
        </div>

        <h4>CSS Styling Tips:</h4>
        <pre><code class="language-css">/* Modern gradient hero */
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 100px 20px;
  text-align: center;
}

.hero h1 {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

/* Feature cards with hover effect */
.feature {
  padding: 2rem;
  border-radius: 12px;
  background: white;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.3s;
}

.feature:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 12px rgba(0,0,0,0.15);
}

/* Pricing card - featured */
.plan.featured {
  transform: scale(1.05);
  border: 3px solid #667eea;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}</code></pre>

        <div class="interactive-demo">
          <h4>🎮 Interactive Demo:</h4>
          <p>Click below to see your landing page come to life!</p>
          <button class="demo-button" onclick="alert('Landing page preview would open here!')">
            Preview Landing Page
          </button>
        </div>

        <div class="checkpoint">
          <strong>✅ Checkpoint:</strong> After completing this step, you should have:
          <ul>
            <li>A hero section with compelling headline</li>
            <li>Feature showcase grid</li>
            <li>3-tier pricing table</li>
            <li>CTA buttons linked to signup</li>
          </ul>
        </div>
      `,
      action: {
        label: 'Create Landing Page',
        link: '/admin/reserved-pages/landing-page',
      },
      quiz: [
        {
          question: 'What should your hero section communicate?',
          options: [
            'Technical specifications',
            'Value proposition and main benefit',
            'Company history',
            'Detailed pricing',
          ],
          correct: 1,
        },
      ],
    },
    {
      id: 3,
      phase: 'Building',
      title: '💾 Step 2: Set Up the Database',
      duration: '10 mins',
      objectives: [
        'Create Tasks table with proper schema',
        'Create Projects table',
        'Create Comments table',
        'Set up relationships and indexes',
      ],
      content: `
        <h3>Building Your Database Schema</h3>
        <p>A solid database foundation is crucial for a scalable SaaS. Let's set up our tables!</p>

        <h4>Using Our Database Manager:</h4>
        <ol>
          <li>Navigate to <strong>Backend → Database</strong></li>
          <li>Click "Create New Collection"</li>
          <li>Follow the wizard to define your schema</li>
        </ol>

        <h4>Tasks Table Schema:</h4>
        <pre><code class="language-json">{
  "name": "tasks",
  "fields": [
    {
      "name": "id",
      "type": "INTEGER",
      "primary": true,
      "autoIncrement": true
    },
    {
      "name": "title",
      "type": "TEXT",
      "required": true,
      "maxLength": 200
    },
    {
      "name": "description",
      "type": "TEXT",
      "required": false
    },
    {
      "name": "status",
      "type": "TEXT",
      "default": "pending",
      "enum": ["pending", "in_progress", "completed", "archived"]
    },
    {
      "name": "priority",
      "type": "TEXT",
      "default": "medium",
      "enum": ["low", "medium", "high", "urgent"]
    },
    {
      "name": "assigned_to",
      "type": "INTEGER",
      "foreignKey": {
        "table": "users",
        "field": "id"
      }
    },
    {
      "name": "created_by",
      "type": "INTEGER",
      "required": true,
      "foreignKey": {
        "table": "users",
        "field": "id"
      }
    },
    {
      "name": "project_id",
      "type": "INTEGER",
      "foreignKey": {
        "table": "projects",
        "field": "id"
      }
    },
    {
      "name": "due_date",
      "type": "DATETIME",
      "required": false
    },
    {
      "name": "tags",
      "type": "TEXT",
      "default": "[]",
      "description": "JSON array of tag strings"
    },
    {
      "name": "created_at",
      "type": "DATETIME",
      "default": "CURRENT_TIMESTAMP"
    },
    {
      "name": "updated_at",
      "type": "DATETIME",
      "default": "CURRENT_TIMESTAMP"
    }
  ],
  "indexes": [
    {
      "fields": ["status", "created_by"],
      "name": "idx_status_user"
    },
    {
      "fields": ["due_date"],
      "name": "idx_due_date"
    },
    {
      "fields": ["project_id"],
      "name": "idx_project"
    }
  ]
}</code></pre>

        <h4>Projects Table Schema:</h4>
        <pre><code class="language-json">{
  "name": "projects",
  "fields": [
    {
      "name": "id",
      "type": "INTEGER",
      "primary": true,
      "autoIncrement": true
    },
    {
      "name": "name",
      "type": "TEXT",
      "required": true
    },
    {
      "name": "description",
      "type": "TEXT"
    },
    {
      "name": "owner_id",
      "type": "INTEGER",
      "required": true,
      "foreignKey": {
        "table": "users",
        "field": "id"
      }
    },
    {
      "name": "team_members",
      "type": "TEXT",
      "default": "[]",
      "description": "JSON array of user IDs"
    },
    {
      "name": "status",
      "type": "TEXT",
      "default": "active",
      "enum": ["active", "on_hold", "completed", "archived"]
    },
    {
      "name": "created_at",
      "type": "DATETIME",
      "default": "CURRENT_TIMESTAMP"
    }
  ]
}</code></pre>

        <div class="pro-tip">
          <strong>💡 Pro Tip:</strong> Always add indexes on fields you'll query frequently (status, user_id, dates).
          This dramatically improves performance as your data grows!
        </div>

        <h4>Quick SQL Reference:</h4>
        <pre><code class="language-sql">-- Create a new task
INSERT INTO tasks (title, description, status, priority, created_by, due_date)
VALUES ('Review pull request', 'Review PR #123', 'pending', 'high', 1, '2025-11-20');

-- Get all tasks for a user
SELECT * FROM tasks
WHERE created_by = 1
AND status != 'archived'
ORDER BY due_date ASC;

-- Update task status
UPDATE tasks
SET status = 'completed', updated_at = CURRENT_TIMESTAMP
WHERE id = 5;

-- Get task statistics
SELECT
  status,
  COUNT(*) as count,
  AVG(CASE WHEN priority='high' THEN 1 ELSE 0 END) as high_priority_ratio
FROM tasks
WHERE created_by = 1
GROUP BY status;</code></pre>

        <div class="checkpoint">
          <strong>✅ Checkpoint:</strong> You should now have:
          <ul>
            <li>Tasks table created with all fields</li>
            <li>Projects table created</li>
            <li>Proper foreign key relationships</li>
            <li>Indexes on frequently queried fields</li>
          </ul>
        </div>
      `,
      action: {
        label: 'Go to Database Manager',
        link: '/admin/database',
      },
    },
    // Continue with more lessons...
  ];

  const markLessonComplete = (lessonId) => {
    if (!completedLessons.includes(lessonId)) {
      setCompletedLessons([...completedLessons, lessonId]);

      // Award achievement
      if (completedLessons.length + 1 === 5) {
        addAchievement('halfway', 'Halfway There! 🎉', 'Completed 5 lessons');
      }
      if (completedLessons.length + 1 === lessons.length) {
        addAchievement('graduate', 'Tutorial Graduate! 🎓', 'Completed all lessons');
      }
    }
  };

  const addAchievement = (id, title, description) => {
    if (!achievements.find(a => a.id === id)) {
      setAchievements([...achievements, { id, title, description, unlockedAt: new Date().toISOString() }]);
    }
  };

  const currentLessonData = lessons[currentLesson];
  const progress = ((completedLessons.length) / lessons.length) * 100;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  📝 Build a Task Management SaaS
                </h1>
                <p className="text-blue-100">
                  Complete step-by-step tutorial to build your first SaaS product
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{completedLessons.length}/{lessons.length}</div>
                <div className="text-sm text-blue-100">Lessons Complete</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar - Lesson List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
                <h3 className="font-bold text-gray-900 mb-4">Tutorial Lessons</h3>
                <div className="space-y-2">
                  {lessons.map((lesson, idx) => (
                    <button
                      key={lesson.id}
                      onClick={() => setCurrentLesson(idx)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                        currentLesson === idx
                          ? 'bg-blue-500 text-white shadow-md'
                          : completedLessons.includes(lesson.id)
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="mr-2">
                            {completedLessons.includes(lesson.id) ? '✓' : idx + 1}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {lesson.title.replace(/^[📋🎨🏗️💾⚙️💳🚀📊]+\s/, '')}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs opacity-75 mt-1">{lesson.duration}</div>
                    </button>
                  ))}
                </div>

                {/* Achievements */}
                {achievements.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-3 text-sm">
                      🏆 Achievements
                    </h4>
                    <div className="space-y-2">
                      {achievements.map((achievement) => (
                        <div
                          key={achievement.id}
                          className="bg-yellow-50 border border-yellow-200 rounded-lg p-2"
                        >
                          <div className="font-semibold text-yellow-900 text-xs">
                            {achievement.title}
                          </div>
                          <div className="text-yellow-700 text-xs">
                            {achievement.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-lg p-8">
                {/* Lesson Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-blue-100 text-blue-700 text-sm font-semibold px-3 py-1 rounded-full">
                      {currentLessonData.phase}
                    </span>
                    <span className="text-gray-500 text-sm">
                      ⏱️ {currentLessonData.duration}
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {currentLessonData.title}
                  </h2>

                  {/* Objectives */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      📌 Learning Objectives:
                    </h4>
                    <ul className="space-y-1">
                      {currentLessonData.objectives.map((obj, idx) => (
                        <li key={idx} className="text-blue-800 text-sm flex items-start">
                          <span className="mr-2">•</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Lesson Content */}
                <div
                  className="prose prose-lg max-w-none tutorial-content"
                  dangerouslySetInnerHTML={{ __html: currentLessonData.content }}
                />

                {/* Action Button */}
                {currentLessonData.action && (
                  <div className="mt-8 p-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl text-white">
                    <h4 className="font-bold text-lg mb-2">Ready to Build?</h4>
                    <p className="mb-4 text-emerald-50">
                      Click below to open the tool and complete this step
                    </p>
                    <button
                      onClick={() => router.push(currentLessonData.action.link)}
                      className="bg-white text-emerald-600 px-6 py-3 rounded-lg font-bold hover:bg-emerald-50 transition-all shadow-lg"
                    >
                      {currentLessonData.action.label} →
                    </button>
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-8 pt-8 border-t border-gray-200 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentLesson(Math.max(0, currentLesson - 1))}
                    disabled={currentLesson === 0}
                    className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    ← Previous Lesson
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={() => markLessonComplete(currentLessonData.id)}
                      className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-all"
                    >
                      ✓ Mark Complete
                    </button>
                    <button
                      onClick={() => setCurrentLesson(Math.min(lessons.length - 1, currentLesson + 1))}
                      disabled={currentLesson === lessons.length - 1}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Next Lesson →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .tutorial-content {
          font-size: 16px;
          line-height: 1.7;
        }
        .tutorial-content h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #1f2937;
        }
        .tutorial-content h4 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #374151;
        }
        .tutorial-content h5 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #4b5563;
        }
        .tutorial-content pre {
          background: #1f2937;
          color: #f3f4f6;
          padding: 1.5rem;
          border-radius: 0.75rem;
          overflow-x: auto;
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .tutorial-content code {
          background: #1f2937;
          color: #10b981;
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        .tutorial-content pre code {
          background: transparent;
          padding: 0;
        }
        .tutorial-content .pro-tip {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-left: 4px solid #f59e0b;
          padding: 1rem 1.25rem;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }
        .tutorial-content .checkpoint {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          border-left: 4px solid #10b981;
          padding: 1rem 1.25rem;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }
        .tutorial-content .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
        }
        .tutorial-content .feature-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1.5rem;
          text-align: center;
          transition: all 0.3s;
        }
        .tutorial-content .feature-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.1);
          transform: translateY(-2px);
        }
        .tutorial-content .feature-icon {
          font-size: 2.5rem;
          margin-bottom: 0.75rem;
        }
        .tutorial-content .flow-diagram {
          background: #eff6ff;
          border: 2px dashed #3b82f6;
          padding: 1.5rem;
          border-radius: 0.75rem;
          text-align: center;
          font-weight: 600;
          color: #1e40af;
          margin: 1.5rem 0;
        }
        .tutorial-content .demo-button {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 0.5rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
        }
        .tutorial-content .demo-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(59, 130, 246, 0.4);
        }
      `}</style>
    </AdminLayout>
  );
}
