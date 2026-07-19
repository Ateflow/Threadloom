# Threadloom

Threadloom is a visual worldbuilding and narrative continuity engine designed for writers, game masters, and narrative designers. Unlike traditional documentation tools, Threadloom features a custom Logic Engine that automatically detects plot holes and continuity errors by evaluating timeline events against user-defined world rules.

This is just work done for a test, Users are allowed to do necessary changes according to their preferences or just use the prebuilt-project code if the users expectations are just to see the working idea.
Please use a powerful IDE for this project. For e.g. - JETBRAIN's WebStorm or Micorsoft's VS Code.

More importantly before you proceed:
# Threadloom Database and SQL Setup Guide

This document provides detailed instructions for setting up the PostgreSQL database, managing the schema, and using SQL to interact with the Threadloom data via DBeaver.

## 1. Prerequisites

Before proceeding, ensure you have the following installed on your system:
* PostgreSQL (Version 14 or higher)
* DBeaver (Community Edition is sufficient for visual database management)
* Node.js (Version 18 or higher)

## 2. Creating the Database

You must create an empty database container before the application can generate tables.

1. Open your terminal or command prompt.
2. Access the PostgreSQL interactive terminal:
   ```bash
   psql -U postgres

## Features

- **Interactive Entity Graph:** Visually map characters, locations, and items using an infinite, draggable canvas powered by ReactFlow.
- **Custom Rule Builder:** Define the physical and magical laws of your world using a visual, no-code interface.
- **Timeline Tracking:** Plot narrative events chronologically and link them to specific entities.
- **Automated Continuity Checking:** The backend Logic Engine evaluates new timeline events against established rules in real-time.
- **Dynamic Visual Feedback:** When a continuity error is detected, the system automatically updates the database, and the frontend instantly reflects the warning by visually flagging the affected entity on the graph.

## Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- Tailwind CSS
- ReactFlow
- Axios

**Backend**
- Node.js
- Express
- TypeScript

**Database & ORM**
- PostgreSQL
- Drizzle ORM

## How the Logic Engine Works

The core differentiator of Threadloom is its ability to evaluate narrative consistency. The workflow operates as follows:

1. **Entity Creation:** A user creates an entity (e.g., a character) and assigns specific traits (e.g., `vampire: true`).
2. **Rule Definition:** The user creates a logic rule (e.g., "Entities with the `vampire` trait cannot perform the `walk_in_sunlight` action").
3. **Event Logging:** The user adds an event to the timeline (e.g., "Count Dracula walks in sunlight").
4. **Evaluation:** The backend intercepts the event, retrieves the entity's traits, and checks them against the active rules.
5. **State Mutation:** If a violation is found, the backend updates the entity's record in the database to include a warning flag.
6. **Visual Update:** The frontend fetches the updated state, rendering the specific node on the graph with a warning state (e.g., a red border and glow).

## Needs

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation and Setup

Note: You can just download "create-threadloom.js" file & open your terminal in the folder which you've placed this file.
Open your terminal in the folder where you saved it.
Run node create-threadloom.js.
The script will create a folder called threadloom-project containing the entire application structure, ready to be used on any machine.




### 3. Clone the Repository

```bash
git clone https://github.com/your-username/threadloom.git
cd threadloom


2. Frontend: `cd threadloom-frontend`, run `npm install`.
3. Run `npm run dev` in both folders.


