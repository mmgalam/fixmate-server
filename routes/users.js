import express from "express";
import { collections } from "../config/db.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// Get current user's full profile
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await collections.users.findOne(
      { email: req.user.email },
      { projection: { password: 0 } },
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to load profile" });
  }
});

// Update profile fields (name, phone, area, bio, image)
router.patch("/profile", verifyToken, async (req, res) => {
  try {
    const { name, phone, area, bio, image } = req.body;
    const updates = {};

    if (name?.trim()) updates.name = name.trim();
    if (typeof phone === "string") updates.phone = phone.trim();
    if (typeof area === "string") updates.area = area.trim();
    if (typeof bio === "string") updates.bio = bio.trim();
    if (image?.trim()) updates.image = image.trim();

    await collections.users.updateOne(
      { email: req.user.email },
      { $set: updates },
    );

    const updatedUser = await collections.users.findOne({
      email: req.user.email,
    });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile" });
  }
});

export default router;
