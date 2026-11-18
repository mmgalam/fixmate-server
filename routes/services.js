import express from "express";
import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";
import { verifyToken, verifyTechnician } from "../middlewares/auth.js";

const router = express.Router();

const ALLOWED_CATEGORIES = [
  "Smartphone",
  "Laptop & PC",
  "AC",
  "Refrigerator",
  "TV",
  "Washing Machine",
  "Electrical",
];

const ALLOWED_MODES = ["Home Visit", "Shop Drop-off"];

// 1. PUBLIC: Search, Filter & Sort Approved Services (Challenge 1)
router.get("/", async (req, res) => {
  try {
    const { search, category, serviceMode, sort, limit } = req.query;

    const query = {
      approvalStatus: "approved",
      isAvailable: true,
    };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ title: regex }, { category: regex }];
    }

    if (category && ALLOWED_CATEGORIES.includes(category)) {
      query.category = category;
    }

    if (serviceMode && ALLOWED_MODES.includes(serviceMode)) {
      query.serviceMode = serviceMode;
    }

    let sortOption = { createdAt: -1 }; // Default: newest
    if (sort === "price-asc") sortOption = { basePrice: 1 };
    if (sort === "price-desc") sortOption = { basePrice: -1 };

    let cursor = collections.services.find(query).sort(sortOption);

    if (limit && Number(limit) > 0) {
      cursor = cursor.limit(Number(limit));
    }

    const services = await cursor.toArray();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch services" });
  }
});

// 2. TECHNICIAN: Get Own Services (Must be placed BEFORE /:id)
router.get(
  "/technician/my",
  verifyToken,
  verifyTechnician,
  async (req, res) => {
    try {
      const services = await collections.services
        .find({ technicianEmail: req.user.email })
        .sort({ createdAt: -1 })
        .toArray();

      res.json(services);
    } catch (err) {
      res.status(500).json({ message: "Failed to load your services" });
    }
  },
);

// 3. PUBLIC: Get Single Approved Service + Technician Profile Summary
router.get("/:id", async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Service not found" });
    }

    const service = await collections.services.findOne({
      _id: new ObjectId(req.params.id),
      approvalStatus: "approved",
      isAvailable: true,
    });

    if (!service) {
      return res
        .status(404)
        .json({ message: "Service not found or unavailable" });
    }

    const technician = await collections.users.findOne(
      { email: service.technicianEmail },
      { projection: { name: 1, email: 1, image: 1, area: 1, bio: 1 } },
    );

    res.json({ service, technician });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch service details" });
  }
});

// 4. TECHNICIAN: Add a New Service (starts as pending approval)
router.post("/", verifyToken, verifyTechnician, async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      image,
      basePrice,
      estimatedDuration,
      serviceMode,
      serviceArea,
    } = req.body;

    if (
      !title?.trim() ||
      !ALLOWED_CATEGORIES.includes(category) ||
      !description?.trim() ||
      !image?.trim() ||
      Number(basePrice) <= 0 ||
      !estimatedDuration?.trim() ||
      !ALLOWED_MODES.includes(serviceMode) ||
      !serviceArea?.trim()
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or missing service fields" });
    }

    const newService = {
      title: title.trim(),
      category,
      description: description.trim(),
      image: image.trim(),
      basePrice: Number(basePrice),
      estimatedDuration: estimatedDuration.trim(),
      serviceMode,
      serviceArea: serviceArea.trim(),
      technicianName: req.user.name,
      technicianEmail: req.user.email,
      approvalStatus: "pending",
      isAvailable: true,
      createdAt: new Date(),
    };

    const result = await collections.services.insertOne(newService);
    res.status(201).json({ ...newService, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: "Failed to create service" });
  }
});

// 5. TECHNICIAN: Update Service or Toggle Availability
router.patch("/:id", verifyToken, verifyTechnician, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid service ID" });
    }

    const filter = {
      _id: new ObjectId(req.params.id),
      technicianEmail: req.user.email,
    };

    const existing = await collections.services.findOne(filter);
    if (!existing) {
      return res
        .status(404)
        .json({ message: "Service not found or unauthorized" });
    }

    // Case A: Only toggling availability switch
    if (
      Object.keys(req.body).length === 1 &&
      typeof req.body.isAvailable === "boolean"
    ) {
      await collections.services.updateOne(filter, {
        $set: { isAvailable: req.body.isAvailable },
      });
      return res.json({
        message: "Availability updated",
        isAvailable: req.body.isAvailable,
      });
    }

    // Case B: Full edit -> Reset approvalStatus back to 'pending'
    const updates = {
      approvalStatus: "pending",
    };

    if (req.body.title) updates.title = req.body.title.trim();
    if (ALLOWED_CATEGORIES.includes(req.body.category))
      updates.category = req.body.category;
    if (req.body.description) updates.description = req.body.description.trim();
    if (req.body.image) updates.image = req.body.image.trim();
    if (Number(req.body.basePrice) > 0)
      updates.basePrice = Number(req.body.basePrice);
    if (req.body.estimatedDuration)
      updates.estimatedDuration = req.body.estimatedDuration.trim();
    if (ALLOWED_MODES.includes(req.body.serviceMode))
      updates.serviceMode = req.body.serviceMode;
    if (req.body.serviceArea) updates.serviceArea = req.body.serviceArea.trim();

    await collections.services.updateOne(filter, { $set: updates });
    res.json({ message: "Service updated and sent for admin re-approval" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update service" });
  }
});

// 6. TECHNICIAN: Delete Service
router.delete("/:id", verifyToken, verifyTechnician, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid service ID" });
    }

    const result = await collections.services.deleteOne({
      _id: new ObjectId(req.params.id),
      technicianEmail: req.user.email,
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "Service not found or unauthorized" });
    }

    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete service" });
  }
});

export default router;
