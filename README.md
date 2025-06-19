# StackCore

A code dependency analysis and visualization platform that helps developers
understand, audit, and optimize their codebase architecture through interactive
visualizations and automated analysis.

## 🚀 Quick Start

### Prerequisites

- [Deno](https://deno.land/) v2.3.5+
- [Docker](https://docker.com)

### Setup for local devlopment

1. **Setup Stripe objects**

   Create a Stripe account and set up the required Stripe objects (products,
   prices, and meters). You can use the convenience script at
   [packages/core/src/stripe/scripts/createObjects.ts](packages/core/src/stripe/scripts/createObjects.ts).

   Run the script and follow the prompts - it will create all the necessary
   objects and output their IDs which you'll need for the next step.

1. **Create `.env` file**

   Copy `.env.example` content into a `.env` file and fill in the missing
   variables.

1. **Start services**

   ```bash
   # database
   deno task db:docker
   deno task db:migrate

   # Terminal 1: stripe CLI to forward webhook to the API
   deno task stripe:forward

   # Terminal 2: Fake gcs bucket
   deno task bucket:mock

   # Terminal 3: API
   deno task dev:core

   # Terminal 4: APP
   deno task dev:app
   ```

### Unit test

Before running the test, you need:

```bash
# mock stripe API
deno task stripe:mock

# mock gcs bucker
deno task bucket:mock

# then run the test
deno task test
```

## 📊 What StackCore Does

- **Dependency Visualization**: Interactive graphs showing file and symbol-level
  dependencies
- **Code Metrics**: Cyclomatic complexity, line counts, dependency analysis
- **Audit Reports**: Automated detection of code quality issues
- **Multi-level Analysis**: Project, file, and symbol-level insights

### Architecture

- **`@stackcore/core`**: Backend API (Deno + Oak)
- **`@stackcore/app`**: Frontend (React + Cytoscape.js)

## 📝 License

[Add your license information here]
