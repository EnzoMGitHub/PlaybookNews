import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { getDB } from "../db.js";

const COLLECTION = "users";

function signAuthToken(user) {
  const payload = {
    userId: user._id,
    username: user.username,
  };
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Err creating auth token");
  return jwt.sign(payload, secret, { expiresIn: "1d" });
}

export async function loginUser({ username, password }) {
    if (typeof username !== "string" || typeof password !== "string") {
        return {passed: false, message: "Username and password must be strings"};
    }
    const db = getDB();
    const user = await db.collection(COLLECTION).findOne({username: username.trim()});

    if (!user) {
        return {passed: false, message: "Invalid username or password"};
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return {passed: false, message: "Invalid username or password"};
    }
    const cookie = signAuthToken(user);

    return {passed: true, chocolateChipCookie: cookie, preferences: user.preferences};
}


