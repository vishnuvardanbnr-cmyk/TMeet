import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Handle both bundled (production) and unbundled (development) scenarios
  let distPath: string;
  
  // Try different possible locations for the public folder
  const possiblePaths = [
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(__dirname, "public"),
    path.resolve(__dirname, "../dist/public"),
  ];
  
  distPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
