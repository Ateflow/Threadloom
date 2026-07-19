/**
 * Threadloom Project Generator
 * Run this script with: node create-threadloom.js
 * It will automatically create the backend and frontend projects,
 * write all source code, and install dependencies.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = 'threadloom-project';

// Helper to write files
function writeFile(filePath, content) {
  const fullPath = path.join(ROOT_DIR, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content);
  console.log(`Created: ${filePath}`);
}

// Helper to run commands
function runCommand(cmd, cwd = ROOT_DIR) {
  console.log(`Running: ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

console.log('🚀 Starting Threadloom Project Generator...\n');

// 1. Create Root Directory
if (!fs.existsSync(ROOT_DIR)) fs.mkdirSync(ROOT_DIR);

// ==========================================
// BACKEND FILES
// ==========================================

const backendPackageJson = `{
  "name": "threadloom-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "seed": "tsx src/seed.ts"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "drizzle-orm": "^0.33.0",
    "express": "^4.19.2",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.5.0",
    "@types/pg": "^8.11.6",
    "drizzle-kit": "^0.24.2",
    "tsx": "^4.17.0",
    "typescript": "^5.5.4"
  }
}`;

const backendTsConfig = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}`;

const drizzleConfig = `import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});`;

const backendEnvExample = `DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/threadloom"`;

const schemaTs = `import { pgTable, uuid, text, timestamp, jsonb, varchar } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const entities = pgTable('entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  description: text('description'),
  traits: jsonb('traits').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rules = pgTable('rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  logicCondition: jsonb('logic_condition').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const timelineEvents = pgTable('timeline_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  entityId: uuid('entity_id').references(() => entities.id, { onDelete: 'cascade' }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});`;

const dbIndexTs = `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });`;

const logicEngineTs = `import { db } from '../db';
import { entities, rules, timelineEvents } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function evaluateEvent(eventId: string) {
  const event = await db.select().from(timelineEvents).where(eq(timelineEvents.id, eventId));
  if (event.length === 0) return { error: 'Event not found' };
  const currentEvent = event[0];

  const character = await db.select().from(entities).where(eq(entities.id, currentEvent.entityId));
  if (character.length === 0) return { error: 'Character not found' };
  const currentCharacter = character[0];

  const projectRules = await db.select().from(rules).where(eq(rules.projectId, currentEvent.projectId));
  const warnings: string[] = [];

  for (const rule of projectRules) {
    const logic = rule.logicCondition as any;
    if (logic.type === 'trait_conflict') {
      const traits = (currentCharacter.traits as any) || {};
      if (traits[logic.requiredTrait]) {
        if (currentEvent.action === logic.forbiddenAction) {
          warnings.push(\`CONTINUITY ERROR: \${currentCharacter.name} is a \${logic.requiredTrait}, but they are trying to \${currentEvent.action}!\`);
          await db.update(entities)
            .set({ traits: { ...traits, hasWarning: true } })
            .where(eq(entities.id, currentCharacter.id));
        }
      }
    }
  }
  return { warnings };
}`;

const serverIndexTs = `import express from 'express';
import cors from 'cors';
import { db } from './db';
import { projects, entities, rules, timelineEvents } from './db/schema';
import { eq } from 'drizzle-orm';
import { evaluateEvent } from './services/logicEngine';

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

app.get('/api/projects', async (req, res) => {
  res.json(await db.select().from(projects));
});

app.get('/api/entities/:projectId', async (req, res) => {
  res.json(await db.select().from(entities).where(eq(entities.projectId, req.params.projectId)));
});

app.get('/api/rules/:projectId', async (req, res) => {
  res.json(await db.select().from(rules).where(eq(rules.projectId, req.params.projectId)));
});

app.post('/api/rules', async (req, res) => {
  const [newRule] = await db.insert(rules).values(req.body).returning();
  res.json(newRule);
});

app.post('/api/timeline', async (req, res) => {
  const [newEvent] = await db.insert(timelineEvents).values(req.body).returning();
  const result = await evaluateEvent(newEvent.id);
  res.json({ event: newEvent, warnings: result.warnings });
});

app.listen(PORT, () => console.log(\`Server running on http://localhost:\${PORT}\`));`;

const seedTs = `import { db } from './db';
import { projects, entities, rules } from './db/schema';

async function seed() {
  console.log('Seeding...');
  const [project] = await db.insert(projects).values({ name: 'My Vampire Novel', description: 'A story about vampires' }).returning();
  const [character] = await db.insert(entities).values({ projectId: project.id, name: 'Count Dracula', type: 'character', traits: { vampire: true } }).returning();
  await db.insert(rules).values({ projectId: project.id, name: 'Sunlight Weakness', logicCondition: { type: 'trait_conflict', requiredTrait: 'vampire', forbiddenAction: 'walk_in_sunlight' } });
  console.log('Project ID:', project.id);
  process.exit(0);
}
seed();`;

writeFile('backend/package.json', backendPackageJson);
writeFile('backend/tsconfig.json', backendTsConfig);
writeFile('backend/drizzle.config.ts', drizzleConfig);
writeFile('backend/.env.example', backendEnvExample);
writeFile('backend/src/db/schema.ts', schemaTs);
writeFile('backend/src/db/index.ts', dbIndexTs);
writeFile('backend/src/index.ts', serverIndexTs);
writeFile('backend/src/services/logicEngine.ts', logicEngineTs);
writeFile('backend/src/seed.ts', seedTs);

// ==========================================
// FRONTEND FILES
// ==========================================

const frontendPackageJson = `{
  "name": "threadloom-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "reactflow": "^11.11.4"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.3",
    "vite": "^5.4.1"
  }
}`;

const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })`;

const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}`;

const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Threadloom</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;`;

const apiTs = `import axios from 'axios';
export const api = axios.create({ baseURL: 'http://localhost:3000/api' });`;

const entityGraphTsx = `import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, { addEdge, Background, Controls, MiniMap, useNodesState, useEdgesState, type Connection, type Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { api } from '../api';

export default function EntityGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const projectsRes = await api.get('/projects');
        if (projectsRes.data.length === 0) return;
        const projectId = projectsRes.data[0].id;
        const entitiesRes = await api.get(\`/entities/\${projectId}\`);
        
        const flowNodes: Node[] = entitiesRes.data.map((entity: any, index: number) => {
          const isWarning = entity.traits?.hasWarning; 
          const bgColor = isWarning ? '#ef4444' : '#4c1d95';
          return {
            id: entity.id,
            type: 'default',
            data: { label: entity.name },
            position: { x: 100 + (index * 150), y: 100 + (index * 100) },
            style: { background: bgColor, color: 'white', border: '2px solid #7c3aed', borderRadius: '8px', padding: '10px', boxShadow: isWarning ? '0 0 15px rgba(239, 68, 68, 0.8)' : 'none' }
          };
        });
        setNodes(flowNodes);
      } catch (error) { console.error(error); }
    }
    fetchData();
  }, []);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <div className="w-full h-full">
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
        <Background color="#374151" gap={16} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}`;

const ruleBuilderTsx = `import React, { useState } from 'react';
import { api } from '../api';

export default function RuleBuilder({ projectId, onRuleCreated }: any) {
  const [name, setName] = useState('');
  const [trait, setTrait] = useState('');
  const [action, setAction] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/rules', {
      projectId, name,
      logicCondition: { type: 'trait_conflict', requiredTrait: trait, forbiddenAction: action }
    });
    setName(''); setTrait(''); setAction('');
    onRuleCreated();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded space-y-4 border border-gray-700">
      <h2 className="text-xl text-purple-400">Create Rule</h2>
      <input placeholder="Rule Name" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 bg-gray-700 rounded" required />
      <input placeholder="Trait (e.g. vampire)" value={trait} onChange={e => setTrait(e.target.value)} className="w-full p-2 bg-gray-700 rounded" required />
      <input placeholder="Forbidden Action" value={action} onChange={e => setAction(e.target.value)} className="w-full p-2 bg-gray-700 rounded" required />
      <button type="submit" className="w-full bg-purple-600 p-2 rounded hover:bg-purple-700">Create Rule</button>
    </form>
  );
}`;

const timelineTsx = `import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Timeline({ projectId }: any) {
  const [entities, setEntities] = useState<any[]>([]);
  const [entityId, setEntityId] = useState('');
  const [action, setAction] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get(\`/entities/\${projectId}\`).then(res => {
      setEntities(res.data);
      if(res.data.length) setEntityId(res.data[0].id);
    });
  }, [projectId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/timeline', { projectId, entityId, action });
    if(res.data.warnings?.length) setMsg('ERROR: ' + res.data.warnings[0]);
    else setMsg('Event added.');
  };

  return (
    <form onSubmit={submit} className="bg-gray-800 p-6 rounded space-y-4 border border-gray-700">
      <h2 className="text-xl text-purple-400">Add Timeline Event</h2>
      <select value={entityId} onChange={e => setEntityId(e.target.value)} className="w-full p-2 bg-gray-700 rounded">
        {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <input placeholder="Action" value={action} onChange={e => setAction(e.target.value)} className="w-full p-2 bg-gray-700 rounded" required />
      <button type="submit" className="w-full bg-purple-600 p-2 rounded hover:bg-purple-700">Add Event</button>
      {msg && <div className="text-red-400 bg-red-900/20 p-2 rounded">{msg}</div>}
    </form>
  );
}`;

const appTsx = `import { useState, useEffect } from 'react';
import EntityGraph from './components/EntityGraph';
import RuleBuilder from './components/RuleBuilder';
import Timeline from './components/Timeline';
import { api } from './api';

function App() {
  const [tab, setTab] = useState('graph');
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    api.get('/projects').then(res => {
      if(res.data.length > 0) setProjectId(res.data[0].id);
    });
  }, []);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <aside className="w-64 bg-gray-800 p-4 border-r border-gray-700">
        <h1 className="text-2xl font-bold text-purple-400 mb-6">Threadloom</h1>
        <nav className="space-y-2">
          <button onClick={() => setTab('graph')} className="w-full text-left px-4 py-2 rounded hover:bg-gray-700">🌍 World Map</button>
          <button onClick={() => setTab('rules')} className="w-full text-left px-4 py-2 rounded hover:bg-gray-700">⚙️ Rules</button>
          <button onClick={() => setTab('timeline')} className="w-full text-left px-4 py-2 rounded hover:bg-gray-700">📜 Timeline</button>
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        {tab === 'graph' && <EntityGraph />}
        {tab === 'rules' && <RuleBuilder projectId={projectId} onRuleCreated={() => {}} />}
        {tab === 'timeline' && <Timeline projectId={projectId} />}
      </main>
    </div>
  );
}
export default App;`;

const mainTsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;

writeFile('frontend/package.json', frontendPackageJson);
writeFile('frontend/vite.config.ts', viteConfig);
writeFile('frontend/tsconfig.json', backendTsConfig); // Reuse backend config for simplicity
writeFile('frontend/tailwind.config.js', tailwindConfig);
writeFile('frontend/postcss.config.js', postcssConfig);
writeFile('frontend/index.html', indexHtml);
writeFile('frontend/src/main.tsx', mainTsx);
writeFile('frontend/src/App.tsx', appTsx);
writeFile('frontend/src/index.css', indexCss);
writeFile('frontend/src/api.ts', apiTs);
writeFile('frontend/src/components/EntityGraph.tsx', entityGraphTsx);
writeFile('frontend/src/components/RuleBuilder.tsx', ruleBuilderTsx);
writeFile('frontend/src/components/Timeline.tsx', timelineTsx);

// ==========================================
// README FILE
// ==========================================

const readme = `# Threadloom
A visual worldbuilding and narrative continuity engine.
## Setup
1. Backend: \`cd threadloom-backend\`, configure \`.env\`, run \`npm install\` and \`npm run db:push\`.
2. Frontend: \`cd threadloom-frontend\`, run \`npm install\`.
3. Run \`npm run dev\` in both folders.`;

writeFile('README.md', readme);
writeFile('.gitignore', 'node_modules\n.env\ndist\n.DS_Store');

// ==========================================
// INSTALLATION
// ==========================================

console.log('\n📦 Installing Backend Dependencies...');
runCommand('npm install', path.join(ROOT_DIR, 'backend'));

console.log('\n📦 Installing Frontend Dependencies...');
runCommand('npm install', path.join(ROOT_DIR, 'frontend'));

console.log('\n✅ Threadloom Project Created Successfully!');
console.log('Next steps:');
console.log('1. Go to threadloom-project/backend and create a .env file with your DB credentials.');
console.log('2. Run "npm run db:push" to create the tables.');
console.log('3. Run "npm run seed" to add dummy data.');
console.log('4. Run "npm run dev" in both folders to start.');