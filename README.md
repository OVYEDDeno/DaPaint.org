# DaPaint.org Deployment Guide

## Deploying to Vercel

To deploy this Expo web app to Vercel, follow these steps:

1. **Export the app for web**:
   ```bash
   npm run export:web
   ```
   or
   ```bash
   npm run export && node scripts/post-export.js
   ```

2. **Deploy to Vercel**:
   - Push your code to GitHub
   - Connect your repository to Vercel
   - Vercel will automatically detect the project settings from `vercel.json`

## How it works

- The `export` script generates a static build of your Expo app in the `dist` folder
- Vercel uses the `@vercel/static-build` to serve the static files
- The route configuration ensures all paths redirect to `index.html` for client-side routing
- Custom 404 page is served for non-existent routes

## Troubleshooting

If you encounter a 404 error:
1. Make sure you've run the export command before deploying
2. Check that the `dist` folder was generated correctly
3. Verify that Vercel is using the correct build command (`npm run export:web`)
4. Ensure the 404.html file is present in the dist folder

## Local Development

- Run `npm start` for development
- Run `npm run web` to preview the web version locally