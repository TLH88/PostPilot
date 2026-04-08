# PostPilot Guided Tours & Tutorials - Requirements Document

> Version: 1.0 | Created: 2026-04-08 | Status: Primary Execution Document

This document defines the complete set of guided tours and step-by-step tutorials for PostPilot. It serves as the primary reference for implementation regardless of which tour library or approach is used.

---

## Design Principles

- **Tone:** Friendly, encouraging, jargon-free. Aimed at 10-14 year old comprehension level.
- **Pacing:** Each tour is self-contained and focused on one area. No single tour exceeds 10 steps.
- **Help integration:** Every tour ends with a link to related help center articles and how-to tutorials.
- **Accessibility:** Always skippable, re-launchable from Help Center, keyboard navigable.
- **Theme:** Cards use system theme colors, compatible with light and dark modes.
- **Completion:** Each tour tracks completion in localStorage. Confetti animation on final step.

---

## Part 1: Application Overview Tours

These tours provide page-level orientation. They show users WHERE things are and WHAT they do, without diving into step-by-step procedures.

---

### Tour 1: Full Application Overview

**Purpose:** Introduce the user to the overall application layout and navigation.
**Trigger:** Auto-starts on first visit to Dashboard after completing onboarding.
**Re-launch:** Help Center > Guided Tours > "Full Application Overview"

| Step | Target Element | Title | Content |
|------|---------------|-------|---------|
| 1 | Sidebar nav (main links) | "Your Navigation" | "This sidebar is your main menu. It takes you to every part of PostPilot: your Dashboard, Idea Bank, Posts, Library, Calendar, and Analytics." |
| 2 | Sidebar settings/help/profile area | "Settings, Help & Profile" | "Down here you'll find your Settings (AI provider, LinkedIn connection), Help Center (guides and tutorials), and your Profile (expertise, voice, and subscription)." |
| 3 | Main content area | "Your Workspace" | "This is where all the action happens. Each page has its own tools and features. Hover any button for a tooltip explaining what it does." |

**Closing message:** "That's the big picture! Want to learn more about a specific area? Check out the detailed tours below."

**Links shown on final step:**
- Dashboard Overview tour
- Idea Bank Overview tour
- Posts Page Overview tour
- Calendar Overview tour
- System Management Overview tour

---

### Tour 2: Dashboard Overview

**Purpose:** Walk through the Dashboard page layout and what each section shows.
**Trigger:** Available from Help Center. Also linked from Tour 1 conclusion.
**Re-launch:** Help Center > Guided Tours > "Dashboard Overview"

| Step | Target Element | Title | Content |
|------|---------------|-------|---------|
| 1 | Metrics cards grid | "Your Content Stats" | "These cards show your content numbers at a glance: total posts, scheduled posts, and published posts. They update automatically as you work." |
| 2 | Quick actions row | "Quick Actions" | "Your starting points. Generate Ideas opens the AI brainstorming tool. Start New Post creates a blank post. View Calendar shows your publishing schedule." |
| 3 | Recent drafts section | "Recent Drafts" | "Your latest draft posts appear here for quick access. Click any draft to jump straight into editing it." |
| 4 | Monthly usage summary | "Monthly Usage" | "Track how much of your monthly plan you've used: posts created, brainstorms, AI messages, and scheduled posts. This resets each month." |
| 5 | Content pillar balance | "Content Balance" | "This shows how your posts are distributed across your content pillars. A good mix keeps your audience engaged and positions you as a well-rounded thought leader." |

**Closing message:** "That's your Dashboard! Ready to create some content? Try the Idea Generation tutorial to get started."

**Links shown on final step:**
- How-To: Idea Generation (Tutorial 1)
- Help article: Getting Started

---

### Tour 3: Idea Bank Overview

**Purpose:** Explain the Ideas page layout, the idea workflow process, and filtering.
**Trigger:** Available from Help Center.
**Re-launch:** Help Center > Guided Tours > "Idea Bank Overview"

| Step | Target Element | Title | Content |
|------|---------------|-------|---------|
| 1 | Idea process flow component | "The Idea Workflow" | "PostPilot follows a simple 3-step process: Generate ideas with AI, filter and organize your favorites, then develop the best ones into LinkedIn posts." |
| 2 | Generate Ideas button | "AI Idea Generator" | "Click this to start a new brainstorming session. The AI uses your expertise, content pillars, and audience to suggest relevant content ideas." |
| 3 | Temperature + status filter bar | "Filter & Search" | "Use temperature filters to sort by urgency: Hot (trending now), Warm (solid evergreen), Cold (niche deep-dives). Use status filters to see Open or Closed ideas." |
| 4 | Search input | "Search Your Ideas" | "Type keywords to quickly find specific ideas in your bank. Search works across titles and descriptions." |
| 5 | Idea card area | "Your Idea Cards" | "Each idea card shows the title, description, temperature badge, and content pillar. Use the buttons to Edit, Archive, or Develop an idea into a full post." |

**Closing message:** "Now you know your way around the Idea Bank! Want to try generating your first ideas? Check out the step-by-step tutorial."

**Links shown on final step:**
- How-To: Idea Generation (Tutorial 1)
- Help article: How Ideas Work

---

### Tour 4: Posts Page Overview

**Purpose:** Explain the Posts page layout, filtering, card actions, and post creation options.
**Trigger:** Available from Help Center.
**Re-launch:** Help Center > Guided Tours > "Posts Page Overview"

| Step | Target Element | Title | Content |
|------|---------------|-------|---------|
| 1 | Metrics cards (Total Posts, Scheduled, Published) | "Post Metrics" | "These cards give you a quick count of your total posts, how many are scheduled, and how many have been published to LinkedIn." |
| 2 | Filter tabs row | "Post Filters" | "Use these tabs to filter your posts by status. 'In Work' shows drafts and scheduled posts. 'Complete' shows published and archived posts. You can also filter by individual status." |
| 3 | Post card Actions dropdown | "Card Actions" | "Each post card has an Actions dropdown. From here you can: Post to LinkedIn, Schedule for later, mark as Manually Posted, View on LinkedIn, Archive, or Delete." |
| 4 | New Post button | "Creating New Posts" | "You can start a new post three ways: click New Post here, develop an idea from the Idea Bank, or use the New Post button in the sidebar. All three open the post editor." |

**Closing message:** "That's the Posts page! Ready to write? Check out the Post Creation tutorial for a complete walkthrough."

**Links shown on final step:**
- How-To: Post Creation (Tutorial 2)
- Help article: Post Actions & Workflow

---

### Tour 5: Calendar Page Overview

**Purpose:** Show the Calendar layout, view options, and scheduled post management.
**Trigger:** Available from Help Center.
**Re-launch:** Help Center > Guided Tours > "Calendar Page Overview"

| Step | Target Element | Title | Content |
|------|---------------|-------|---------|
| 1 | Calendar grid area | "Your Content Calendar" | "This calendar shows all your scheduled posts. Each colored dot or card represents a post waiting to be published at its scheduled time." |
| 2 | View toggle buttons (Month/Week/Day) | "Calendar Views" | "Switch between Month view (big picture), Week view (more detail with images), and Day view (hourly timeslots). Click any date to drill into that day." |
| 3 | Upcoming posts sidebar | "Upcoming Posts" | "Your next scheduled posts are listed here, sorted by date. Each card shows the post title, scheduled publish time, and status." |
| 4 | Reschedule/Post Now buttons on upcoming cards | "Quick Actions" | "Use 'Reschedule' to change when a post publishes, or 'Post Now' to publish it to LinkedIn immediately. You can also click any post to open it in the editor." |

**Closing message:** "That's the Calendar! Need to manage your schedule? Check out the Scheduled Post Management tutorial."

**Links shown on final step:**
- How-To: Scheduled Post Management (Tutorial 3)
- Help article: Scheduling & Calendar

---

### Tour 6: System Management Overview

**Purpose:** Point users to Settings, Help, and Profile in the sidebar and briefly describe each.
**Trigger:** Available from Help Center.
**Re-launch:** Help Center > Guided Tours > "System Management Overview"

| Step | Target Element | Title | Content |
|------|---------------|-------|---------|
| 1 | Settings link in sidebar | "Settings" | "Settings is where you configure your AI provider and API key, connect your LinkedIn account, manage workspace settings, and choose your app theme (light or dark)." |
| 2 | Help link in sidebar | "Help Center" | "The Help Center has detailed guides for every feature, step-by-step tutorials, and the ability to restart any guided tour. Help articles also appear in a slide-out panel when you're working in other areas." |
| 3 | Profile/avatar in sidebar | "Your Profile" | "Your Profile stores your expertise, writing voice, content pillars, and subscription plan. The AI uses this information to generate content that sounds like you, not a robot." |

**Closing message:** "Those are your system tools! For detailed walkthroughs of each area, check out the tutorials below."

**Links shown on final step:**
- How-To: System Management - Settings (Tutorial 5)
- How-To: System Management - Help Center (Tutorial 6)
- How-To: System Management - Profile (Tutorial 7)

---

## Part 2: Step-by-Step How-To Tutorials

These tutorials walk users through specific tasks with detailed instructions. Each step tells the user exactly what to do, what they'll see, and what happens next.

---

### Tutorial 1: Idea Generation - From Brainstorm to Initial Draft

**Purpose:** Walk the user through the complete idea generation and development workflow.
**Pages involved:** Dashboard > Ideas > Post Editor
**Re-launch:** Help Center > Tutorials > "Idea Generation"

| Step | Page | Target Element | Title | Content |
|------|------|---------------|-------|---------|
| 1 | Dashboard | Generate Ideas button | "Start Brainstorming" | "Let's generate some content ideas! Click the 'Generate Ideas' button to open the AI Idea Generator. We'll walk you through each step." |
| 2 | Ideas | Generate Ideas button | "Open the Idea Generator" | "Click 'Generate Ideas' to open the brainstorming dialog. You'll choose a content pillar and topic for the AI to work with." |
| 3 | Ideas (dialog) | Content pillar selector (inside dialog) | "Pick a Content Pillar" | "Select a content pillar (the main theme for your ideas). This helps the AI suggest topics that fit your expertise. If you're not sure, pick the one you post about most." |
| 4 | Ideas (dialog) | Topic input field (inside dialog) | "Enter a Topic" | "Type a topic or question you'd like to explore. For example: 'leadership lessons from my career' or 'AI trends in marketing'. The more specific, the better the ideas." |
| 5 | Ideas (dialog) | Generate button (inside dialog) | "Generate!" | "Click 'Generate Ideas' and the AI will brainstorm several ideas based on your topic, expertise, and audience. This takes a few seconds." |
| 6 | Ideas | Idea cards in bank | "Review Your Ideas" | "Here are your new ideas! Each one has a temperature badge: Hot (timely, high engagement), Warm (solid evergreen), or Cold (niche deep-dive). Read through them and decide which ones excite you." |
| 7 | Ideas | Develop button on an idea card | "Develop into a Post" | "Found one you like? Click 'Develop' to turn it into a LinkedIn post. The AI will automatically create an initial draft based on the idea's title and description, using your writing voice." |
| 8 | Post Editor | AI chat panel with draft | "Your First Draft" | "The AI has written an initial draft for you! Review it in the editor. You can edit it directly, or use the AI Assistant on the right to refine it further. Click 'Apply to Editor' on any AI suggestion to use it." |

**Closing message:** "You've gone from a blank page to a first draft! Continue with the Post Creation tutorial to learn how to polish, format, and publish your post."

**Links shown on final step:**
- How-To: Post Creation (Tutorial 2)
- Help article: How Ideas Work
- Help article: AI Assistant

---

### Tutorial 2: Post Creation - From Draft to Published

**Purpose:** Complete post editing workflow from initial draft through to publishing.
**Pages involved:** Post Editor
**Pre-requisite:** User should have a post open in the editor (ideally from Tutorial 1).
**Re-launch:** Help Center > Tutorials > "Post Creation"

| Step | Target Element | Title | Content |
|------|---------------|-------|---------|
| 1 | Progress bar | "Your Post's Journey" | "This progress bar shows where your post is in the workflow: Draft, Scheduled, or Published. Timestamps appear as you move through each stage." |
| 2 | Content editor area | "Write Your Content" | "This is your writing space. Type or edit your post here. Everything auto-saves as you type (look for the cloud icon). LinkedIn allows up to 3,000 characters." |
| 3 | Emoji picker button | "Add Emojis" | "Click the emoji picker to browse and insert emojis into your post. Emojis help your post stand out in the LinkedIn feed and add personality." |
| 4 | Format dropdown menu | "Formatting Tools" | "The Format menu gives you line breaks (for spacing), bullet points (for lists), Hook Analysis (AI feedback on your opening lines), Save to Library (save great lines for reuse), and Copy Post (clipboard)." |
| 5 | Insert from Library button | "Insert Library Content" | "Click here to insert saved hooks, CTAs, closings, or snippets from your Content Library. This is a huge time-saver once you've built up a collection of your best content pieces." |
| 6 | AI chat toggle button | "Your AI Writing Partner" | "Open the AI Assistant panel. It knows your voice, style, and everything about your current post. Try quick suggestions like 'Add a hook', 'Make it shorter', or type your own request." |
| 7 | Image section | "Add an Image" | "Upload your own image or click 'Generate with AI' to create one. Choose the format (landscape or square), art style, and customize the prompt. Every image is saved as a version so you can switch between them." |
| 8 | Hashtags section | "Add Hashtags" | "Click 'Suggest' to let AI recommend relevant hashtags, or type your own. Hashtags help your post reach people beyond your network. LinkedIn recommends 3-5 per post." |
| 9 | Versions dropdown | "Save & Manage Versions" | "Save different versions of your post to explore multiple approaches to the same topic. You can also save the current post as a reusable template for future content." |
| 10 | Actions dropdown | "Publish Your Post" | "When you're ready, use the Actions menu. 'Post to LinkedIn' opens a preview first (you'll confirm before it goes live). 'Schedule Post' lets you pick a future date and time. 'Manually Posted' is for posts you've already shared yourself." |

**Closing message:** "You know how to create, format, and publish a LinkedIn post! Check out the Scheduled Post Management tutorial to learn how to manage your publishing calendar."

**Links shown on final step:**
- How-To: Scheduled Post Management (Tutorial 3)
- Help article: Post Actions & Workflow
- Help article: Content Library
- Help article: AI Assistant

---

### Tutorial 3: Scheduled Post Management

**Purpose:** Teach users how to use the Calendar page to manage their scheduled posts.
**Pages involved:** Calendar
**Re-launch:** Help Center > Tutorials > "Scheduled Post Management"

| Step | Target Element | Title | Content |
|------|---------------|-------|---------|
| 1 | Calendar grid | "Your Publishing Schedule" | "The calendar shows all your scheduled posts on the dates they'll be published. Each post appears as a colored card on its scheduled day." |
| 2 | View toggle (Month/Week/Day) | "Change Your View" | "Switch views to see your schedule differently. Month view shows the big picture. Week view shows more detail with post images. Day view shows hourly timeslots." |
| 3 | A post pill/card on the calendar | "Hover for Details" | "Hover over any post on the calendar to see a quick preview: the title, first few lines of content, scheduled time, and content pillar." |
| 4 | Upcoming posts sidebar | "Upcoming Posts" | "This panel lists your next scheduled posts in order. It's the quickest way to see what's coming up and take action." |
| 5 | Reschedule button on upcoming card | "Reschedule a Post" | "Need to change when a post publishes? Click 'Reschedule' to pick a new date and time. The post stays exactly as it is, just the timing changes." |
| 6 | Post Now button on upcoming card | "Publish Immediately" | "Don't want to wait? Click 'Post Now' to publish a scheduled post to LinkedIn right away. You'll see a preview before it goes live." |

**Closing message:** "You're a scheduling pro! Your posts will publish automatically at the times you set. If a post misses its window, it shows up as 'Past Due' on the Posts page."

**Links shown on final step:**
- Help article: Scheduling & Calendar
- How-To: Post Creation (Tutorial 2)

---

### Tutorial 4: Analytics - Importing LinkedIn Performance Data

**Purpose:** Walk users through the analytics import process and explain available metrics.
**Pages involved:** Analytics
**Re-launch:** Help Center > Tutorials > "Analytics Import"

| Step | Target Element | Title | Content |
|------|---------------|-------|---------|
| 1 | Analytics page header/overview area | "Track Your Performance" | "The Analytics page shows how your LinkedIn posts are performing. You can track impressions (how many people saw your post) and engagement (likes, comments, shares)." |
| 2 | Import button | "Import Your Data" | "PostPilot doesn't pull analytics automatically yet (that's a future feature). Instead, you copy data from your LinkedIn Analytics page and paste it here. It takes about 2 minutes." |
| 3 | Metrics display area | "What You Can Track" | "Once imported, you'll see: Impressions (views), Reactions (likes), Comments, Reposts, and Click-through rate. These help you understand which topics and formats your audience loves." |
| 4 | Post-level metrics | "Per-Post Performance" | "Each post shows its own engagement numbers. Compare your posts to learn what works best: which hooks, topics, and formats get the most attention." |

**Closing message:** "Important: Analytics import only works for posts created and published from PostPilot. Automated analytics are planned for a future update. For now, import your data periodically to track trends."

**Links shown on final step:**
- Help article: Import LinkedIn Post Analytics
- Note: "Automated analytics coming in a future update"

---

### Tutorial 5: System Management - Settings

**Purpose:** Walk through the Settings page and key configuration options.
**Pages involved:** Settings
**Re-launch:** Help Center > Tutorials > "Settings"

| Step | Target Element | Title | Content |
|------|---------------|-------|---------|
| 1 | Settings page header | "Your Settings" | "This is where you configure PostPilot to work the way you want. Let's walk through the key areas." |
| 2 | AI Provider section | "AI Provider (BYOK)" | "PostPilot uses a 'Bring Your Own Key' approach for Creator plans and above. This means you connect your own AI provider account (Anthropic, OpenAI, Google, or Perplexity) and use your own API key. You control the costs and can switch providers anytime." |
| 3 | AI model selector | "Choose Your AI Model" | "Each provider offers different models. More powerful models produce better results but may cost more per request. You can change this anytime to balance quality and cost." |
| 4 | LinkedIn connection section | "LinkedIn Connection" | "This section shows your LinkedIn posting connection status. If you ever see a disconnect banner at the top of any page, come here or click 'Reconnect Now' on the banner to re-establish the connection." |
| 5 | Theme toggle | "Appearance" | "Choose between light and dark mode. Your preference is saved automatically." |

**Closing message:** "Your settings are all set! If you ever need to change your AI provider or reconnect LinkedIn, this is where to come."

**Links shown on final step:**
- Help article: API key setup guides (per provider)
- Help article: How scheduling works

---

### Tutorial 6: System Management - Help Center

**Purpose:** Show users how to use the Help Center and the slide-out help panel.
**Pages involved:** Help
**Re-launch:** Help Center > Tutorials > "Help Center"

| Step | Target Element | Title | Content |
|------|---------------|-------|---------|
| 1 | Help page header | "Your Help Center" | "The Help Center is your go-to resource for learning PostPilot. It has guides for every feature, API key setup instructions, and these guided tours." |
| 2 | Guided Tours section | "Guided Tours" | "You can restart any guided tour from here. Tours walk you through features with visual highlights, step by step." |
| 3 | API key guides section | "API Key Guides" | "Detailed step-by-step instructions for setting up API keys with each AI provider: Anthropic (Claude), OpenAI (GPT), Google (Gemini), and Perplexity (Sonar)." |
| 4 | Getting Started / Content Tools sections | "Feature Guides" | "These sections cover the core features: Idea Generation, Post Creation, Content Library, Templates, AI Assistant, and Scheduling. Each guide explains how the feature works and tips for getting the most out of it." |

**Closing message:** "Pro tip: When you're working in other parts of the app, help articles appear in a slide-out panel on the right side. You don't have to leave what you're doing to get help. Just look for the help icon or 'Learn more' links on tooltips."

**Links shown on final step:**
- (None needed - they're already on the Help page)

---

### Tutorial 7: System Management - User Profile

**Purpose:** Explain the Profile page and how the system uses profile data for AI personalization.
**Pages involved:** Profile
**Re-launch:** Help Center > Tutorials > "User Profile"

| Step | Target Element | Title | Content |
|------|---------------|-------|---------|
| 1 | Profile page header | "Your Creator Profile" | "Your profile is the foundation of PostPilot's AI personalization. The information you enter here shapes how the AI writes for you, making content sound like YOU, not a generic robot." |
| 2 | Account section (email, subscription) | "Account & Subscription" | "Your account details and current subscription plan are shown here. You can change your email, password, and plan from this section." |
| 3 | Basic info section (name, headline, LinkedIn URL) | "Professional Identity" | "Your name, headline, and LinkedIn URL help the AI understand who you are professionally. This context is included in every AI request." |
| 4 | Background section (resume, LinkedIn about) | "Your Background" | "Upload your resume (optional) or paste your LinkedIn About section. This gives the AI deeper context about your experience and credentials, which helps it write more authentic, credible content." |
| 5 | Expertise & audience section | "Expertise & Audience" | "Your areas of expertise, industries, and target audience tell the AI WHO you're writing for and WHAT you know. The more specific you are, the more relevant the AI's suggestions." |
| 6 | Voice & style section (pillars, tone, samples) | "Your Voice & Style" | "This is the most important section. Content pillars define your recurring themes. Writing tone sets the mood. Voice samples (2-3 paragraphs of your best writing) teach the AI exactly how you express ideas." |

**Closing message:** "Your profile is like a creative brief for the AI. The more complete it is, the better PostPilot understands your voice. You can update it anytime as your expertise and style evolve."

**Links shown on final step:**
- Help article: AI Assistant (explains how voice profile is used)
- How-To: Idea Generation (Tutorial 1)

---

## Implementation Notes

### Tour Architecture
- Each tour is independent and self-contained
- Tours are identified by unique name (e.g., "overview-app", "overview-dashboard", "howto-idea-generation")
- Completion state stored per-tour in localStorage
- All tours re-launchable from Help Center > Guided Tours section

### Tour Card Design
- Primary (blue) background with white text
- Progress bar (thin, white) + "Step X of Y" counter
- Back / Next / Close (X) buttons
- "Need help?" button opens relevant help sidebar article
- Final step shows confetti + links to related tours/articles
- Width: 360px, responsive max-width

### Cross-Page Navigation
- Tours that span multiple pages use route-based navigation between steps
- 1.2 second delay after navigation for elements to mount
- Back button on cross-page steps navigates to previous page

### Help Center Integration
- Help page has a "Guided Tours" section listing all tours with restart buttons
- Help sidebar has a compact tour section with restart option
- Individual help articles link to relevant tutorials
- Tour final steps link to related help articles

### Tour Target Elements
All tour target elements use `id="tour-*"` attributes. No tour-specific code (imports, hooks) should be in page components beyond the ID attributes and auto-start logic on the Dashboard.

### Auto-Start Behavior
- Only the "Full Application Overview" tour auto-starts (on first Dashboard visit after onboarding)
- All other tours are accessed on-demand from the Help Center
- Auto-start checks localStorage to avoid re-showing completed tours

---

## Tour Name Registry

| Tour Name | Type | Steps | Pages |
|-----------|------|-------|-------|
| `overview-app` | Overview | 3 | Dashboard (sidebar) |
| `overview-dashboard` | Overview | 5 | Dashboard |
| `overview-ideas` | Overview | 5 | Ideas |
| `overview-posts` | Overview | 4 | Posts |
| `overview-calendar` | Overview | 4 | Calendar |
| `overview-system` | Overview | 3 | Sidebar |
| `howto-idea-generation` | Tutorial | 8 | Dashboard > Ideas > Post Editor |
| `howto-post-creation` | Tutorial | 10 | Post Editor |
| `howto-scheduled-posts` | Tutorial | 6 | Calendar |
| `howto-analytics` | Tutorial | 4 | Analytics |
| `howto-settings` | Tutorial | 5 | Settings |
| `howto-help-center` | Tutorial | 4 | Help |
| `howto-profile` | Tutorial | 6 | Profile |

**Total: 13 tours, 67 steps**
