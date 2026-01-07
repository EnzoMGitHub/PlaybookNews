import jwt from "jsonwebtoken";

// Require Auth Export Function
// Brief: Validates jwt auth
export function requireAuth(req, res, next) {
  const token = req.cookies?.auth;

  // Edge case: No environment variable (it exists :) )
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  // Fail Case: No cookie to begin with
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    // If valid no errors should be thrown
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.userId,
      username: decoded.username,
    };
    return next();
  } catch (err) {
    res.clearCookie("auth"); // Get rid of invalid cookie
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// Auth guard for pages: redirects to /login instead of returning JSON
export function requireAuthPage(req, res, next) {
    const token = req.cookies?.auth;
    if (!token || !process.env.JWT_SECRET) {
        return res.redirect("/login");
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: decoded.userId,
            username: decoded.username,
        };
        return next();
    } catch (err) {
        res.clearCookie("auth");
        return res.redirect("/login");
    }
}

export function reverseAuthPage(req,res,next) {
    const token = req.cookies?.auth;
    if (!token || !process.env.JWT_SECRET) return next();
    try {
        jwt.verify(token, process.env.JWT_SECRET);
        return res.redirect("/");
    } catch (err) {
        res.clearCookie("auth");
        return next();
    }
}

// For API routes: block access when already logged in
export function reverseAuth(req, res, next) {
  const token = req.cookies?.auth;
  if (!token || !process.env.JWT_SECRET) return next();
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return res.status(400).json({ error: "Already logged in" });
  } catch (err) {
    res.clearCookie("auth");
    return next();
  }
}
