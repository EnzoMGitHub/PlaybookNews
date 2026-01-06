import express from "express";
import cookieParser from "cookie-parser";
import fs from 'fs/promises';
import { connectDB, getDB } from "./db.js";
import { loginUser } from "./getReqs/loginUser.js";
import { requireAuth } from "./auth.js";
import { createUser } from "./setReqs/createUser.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "../pages")));

const isProd = process.env.NODE_ENV === "production";


// App Post Login Request
// Brief: Logging in the User
// Calls external loginUser function which interacts with mongoDB (most of the heavy lifting)
// Creates an auth cookie
// Returns the response object with the user's useful (not sensitive) information
app.post("/api/login", async (req, res) => {
  const result = await loginUser(req.body);
  if (!result.passed) {
    return res.status(401).json({ error: result.message });
  }

  res.cookie("auth", result.chocolateChipCookie, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",         
    maxAge: 24 * 60 * 60 * 1000
  });

  return res.json({ username: req.body.username, preferences: result.preferences });
});

// App Post User Request
// Brief: Creates a new user and logs in
app.post("/api/user", async (req,res) => {
    try {
        const userId = await createUser(req.body);
        const login = await loginUser({username: req.body.username, password: req.body.password});
        if (!login.passed) {
            throw new Error(login.message || "Unable to login newly created user");
        }

        res.cookie("auth", login.chocolateChipCookie, {
            httpOnly: true,
            secure: isProd,
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        });
        // successful case
        return res.status(201).json({ userId: userId, username: req.body.username, preferences: login.preferences });
    } catch (err) {
        return  res.status(400).json({ error: err.message });
    }
});

// App Post Preference Request
// Brief: Updates the Preferences Object
app.post("/api/preferences", requireAuth,  async (req, res) => {
    try {
        const preferences = req.body.preferences;
        if (typeof preferences !== "object") {
            return res.status(400).json({ error: "Invalid preferences format" });
        }

        const db = getDB();
        await db.collection("users").updateOne(
            { username: req.user.username },
            { $set: { preferences: preferences } }
        );

        return res.json({ message: "Preferences updated successfully" });
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
});


// Get requests:

// App Get Me Request
// Brief: Determines Whether or Not User is Logged In
// Checks whether the request body has a username, AND a valid jwt
app.get("/api/me", requireAuth, async (req, res) => {
    try {
        if (!req.user?.username) {
            return res.status(401).json({ error: "not logged in" });
        }
    
        const db = getDB();
        const user = await db.collection("users").findOne(
            { username: req.user.username },
            { projection: { passwordHash: 0 } }
        );

        if (!user) return res.status(401).json({ error: "not logged in" });

        return res.json({
            username: user.username,
            preferences: user.preferences ?? {},
        });
    } catch (err) {
        return res.status(500).json({ error: "server error" });
    }
});

// serving pages

// App Home Get Request
// Brief: Serves the Home Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../pages/index.html"));
});


// App Login Get Request
// Brief: Serves Login page IFF the user is not logged in
app.get("/login", (req, res) => {
    if (req.cookies?.auth) {
        return res.redirect("/");
    }
    res.sendFile(path.join(__dirname, "../pages/login.html"));
});

// App Signup Get Request
// Brief: Serves the signup page IFF the user is not logged in
app.get("/signup", (req, res) => {
    if (req.cookies?.auth) {
        return res.redirect("/");
    }
    res.sendFile(path.join(__dirname, "../pages/user.html"));
});

// App Logout Get Request
// Clears the Cookie (jwt) and returns cleared user payload
app.get("/logout", (req, res) => {
    res.clearCookie("auth", {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
    });
    req.user = null;
    return res.json({ ok: true, username: null, preferences: null });
});

// App Pref Get Request
// Brief: Serves the team setter only if logged in AND no team is set; otherwise redirect home
app.get("/pref", async (req,res) => {
    try {
        // If not logged in, redirect
        if (!req.cookies?.auth) {
            return res.redirect("/");
        }

        const db = getDB();
        const user = await db.collection("users").findOne(
            { username: req.user?.username },
            { projection: { preferences: 1, username: 1 } }
        );

        // If user missing or already has a team, go home
        if (!user || user.preferences?.team) {
            return res.redirect("/");
        }

        return res.sendFile(path.join(__dirname, "../pages/pref.html"));
    } catch (err) {
        return res.redirect("/");
    }
});

// App Team Get Request
// Brief: Serves specified team info from json object
app.get('/api/team/:id', async (req, res) => {
    try {
        const teams = JSON.parse(await fs.readFile(path.join(__dirname, './teams.json')));
        const team = teams[req.params.id];
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }
        res.json(team);
    } catch (err) {
        res.status(500).json({message: "Server Error"});
    }
});

console.log("Connecting to database and starting server...");
await connectDB();
app.listen(process.env.PORT || 3000);
