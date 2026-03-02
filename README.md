# CareSphere

A web-based application designed to help users *manage their medicine schedules, receive **timely reminders, and track **dose adherence* efficiently.  
Built with modern web technologies, it supports *AI-based adherence prediction, **chatbot assistance, and **Google Calendar integration* for an intelligent and seamless healthcare experience.

---

##  Table of Contents
- [Overview](#overview)
- [Features](#features)
  - [Basic Features](#basic-features)
  - [Advanced Features](#advanced-features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Folder Structure](#folder-structure)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

---

##  Overview

The *CareSphere* helps users set up personalized medication schedules and ensures timely intake through intelligent reminders and visual tracking dashboards.  
Advanced AI features enhance user engagement by learning patterns and providing proactive suggestions.

---

##  Features

###  Basic Features
1. *Medicine Schedule Setup:*  
   Users can add pill name, dosage, time, and frequency.

2. *Smart Notifications:*  
   Receive timely reminders via *browser alerts* and *email*(this is not yet implemented).

3. *Dose Tracking:*  
   Simple log to track *taken vs missed doses*.

4. *User Dashboard:*  
   View *upcoming* and *past reminders* in a clean dashboard.

5. *CRUD Functionality:*  
   Edit or delete medication schedules easily.

6. *Data Visualization Dashboard:*  
   Graphs showing *adherence rates, **missed doses, and **trends over time*.

---

###  Advanced Features
1. *AI-Powered Adherence Prediction:*  
   - Detects user patterns (e.g., missing night doses).  
   - Sends *extra reminders* before high-risk times.  
   - Offers *proactive nudges*, e.g.,  
     > “You usually forget your pill after dinner — should I remind you again in 15 minutes?”

2. *AI Chatbot Health Assistant:*  
   - Users can ask natural language questions such as:  
     - “What pills do I need to take today?”  
     - “Did I miss any dose yesterday?”

3. *Google Calendar Integration (Showstopper Feature):*  
   - Medication schedules *sync directly* with Google Calendar.  
   - AI assistant can *auto-update* calendar events if a dose is missed or rescheduled.

---

##  Tech Stack

| Category | Technologies |
|-----------|---------------|
| *Frontend* | React.js, Tailwind CSS, Chart.js |
| *Backend* | Node.js, Express.js |
| *Database* | MongoDB |
| *Notifications* | Firebase Cloud Messaging (FCM) | nodecron |
| *Integration* | Google Calendar API |
| *Authentication* | JWT-based Auth |

---

##  Installation

### Prerequisites
- Node.js (v18+)
- npm or yarn
- MongoDB running locally or via Atlas
- Firebase project setup for notifications
- HUGGING FACE token generation for chatbot

### Steps
```bash
# Clone the repository
git clone https://github.com/ishu810/CareSphere

# Move into project directory
cd CareShpere

# Install dependencies
npm install

# Create a .env file and add:
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
FIREBASE_API_KEY=your_firebase_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
HUGGINGFACEHUB_API_TOKEN="your token"
NEXT_PUBLIC_FIREBASE_PROJECT_ID=project id
FIREBASE_CLIENT_EMAIL=your client email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour private key-----\n",
GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\service-account-file.json"


# Start the development server
npm run dev
