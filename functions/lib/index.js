import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import express from "express";
// Initialize Firebase Admin SDK
admin.initializeApp();
const app = express();
// Middleware
app.use(express.json());
// Example API endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});
// Health check function
export const api = onRequest(app);
// Example Firestore trigger
export const onUserCreated = onDocumentCreated("users/{userId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        console.log("No data associated with the event");
        return;
    }
    const user = snap.data();
    console.log("New user created:", user);
    // Add any initialization logic here
});
// Example scheduled function (runs every day at 2 AM UTC)
export const scheduled = onSchedule("every day 02:00", async (context) => {
    console.log("Scheduled function executed at:", new Date());
    // Add any scheduled tasks here
});
