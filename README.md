# Ontology Vocabulary Learning App (MVP)

Development Date: 2026-02-05

This folder contains the source code for the Ontology-based GraphDB Vocabulary Learning App.

## Folder Structure

- **apps/web**: Next.js Frontend (Visualizes the Knowledge Graph)
- **apps/api**: Express/Node.js Backend (Connects to Neo4j, Handles CSV Import)
- **packages/shared**: Shared TypeScript types
- **docker-compose.yml**: Neo4j Database configuration

## How to Run (Local)

1. **Start Database**
   Make sure Docker is installed.

   ```bash
   docker-compose up -d
   ```

2. **Start Backend**

   ```bash
   cd apps/api
   npm run dev
   ```

3. **Start Frontend**

   ```bash
   cd apps/web
   npm run dev
   ```

4. **Initialize Data**
   - Access the API to import the CSV data:
     `POST http://localhost:3001/import-csv`

## Features Implemented

- **Graph Schema**: Word, Sense, Example entities and relationships.
- **CSV Ingestion**: Pipeline to read `master_vocabulary_table9000.csv` and populate Neo4j.
- **Visualization**: React Force Graph 2D integration to explore word connections.
