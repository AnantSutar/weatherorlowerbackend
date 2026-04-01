import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const { PrismaClient } = pkg;


dotenv.config();

console.log("ENV CHECK:");
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);

if (process.env.DATABASE_URL) {
  const masked = process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@");
  console.log("DATABASE_URL (masked):", masked);
}

const app = express();
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.use(cors());
app.use(express.json());

const prisma = new PrismaClient({
  adapter,
});

app.post("/score", async (req, res) => {
  try {
    const rawName =
      typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const rawScore = req.body?.score;
    const score = Number(rawScore);

    if (!rawName || !Number.isInteger(score) || score < 0) {
      return res.status(400).json({ error: "Name and score are required." });
    }

    const newScore = await prisma.score.create({
      data: { name: rawName.slice(0, 30), score },
    });

    res.status(201).json(newScore);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save score" });
  }
});

app.get("/leaderboard", async (req, res) => {
  try {
    const scores = await prisma.score.findMany({
      select: {
        id: true,
        name: true,
        score: true,
        createdAt: true,
      },
      orderBy: { score: "desc" },
      take: 10,
    });

    res.json(scores);
  } catch (err) {
    console.error("LEADERBOARD ERROR:", err.message, err.code);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

app.get("/", (req, res) => {
  res.send("API is running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
