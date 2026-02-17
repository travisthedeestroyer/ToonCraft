<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1d8yKLmdDsvkgbBkRQn_N7AXF1U9mJqFV

## Run Locally

**Prerequisites:**  Node.js

1.  **Install dependencies:**
    `npm install`
2.  **Set up Environment Variables:**
    Create a `.env` file in the root of the project and add your API keys:
    ```
    VITE_GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    VITE_HUGGINGFACE_API_KEY="YOUR_HUGGINGFACE_API_KEY"
    ```
3.  **Run the app:**
    `npm run dev`
