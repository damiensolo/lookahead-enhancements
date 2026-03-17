<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/fadc2e89-cff3-46ea-9667-afc99e47d26e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Lookahead GC–SC collaboration demo

To demonstrate the General Contractor (GC) and Subcontractor (SC) personas and the commitment workflow:

- **GC view** (full lookahead, publish, create lookahead):  
  `http://localhost:5173/?persona=gc`

- **SC view** (tasks filtered by company; commit/propose/reject on net-new tasks):  
  `http://localhost:5173/?persona=sc&company=Elliott%20Subcontractors`

Use other contractor names for SC (e.g. `company=Mora%20Specialty%20Contractors`, `company=Farley%20Structures`) to see their tasks. Net-new tasks (added after GC publishes) show a “Commit required” badge and a commitment section in the task details panel where the SC can commit (after accepting planned qty, adding crew, and verifying equipment/material), propose different dates, or reject with a reason. Rejecting with “Unanswered RFI” adds the task to the **Project risks** list in the header.
