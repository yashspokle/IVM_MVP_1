require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const pool = require("./src/config/db");
const {
  scrapeAll,
  CITY_CONFIG,
  findNearestCity,
} = require("./scrapers");

const app = express();          // <-- CREATE app FIRST

const authMiddleware = require("./src/middleware/auth");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// NOW it is safe to use app.post()

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], inventory = [] } = req.body;

    const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite"
});

    const inventoryText =
      inventory.length > 0
        ? inventory
            .map(
              (item) =>
                `${item.item_name || item.name} - Quantity: ${
                  item.quantity
                }, Expiry: ${item.expiry_date || "N/A"}`
            )
            .join("\n")
        : "Inventory is empty.";

    const conversation = messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const prompt = `
You are Grocero AI, a smart grocery assistant.

Current Inventory:
${inventoryText}

Conversation:
${conversation}

Help the user with:
- Grocery management
- Recipe suggestions
- Expiry reminders
- Shopping advice
- Healthy food recommendations

Answer naturally and briefly.
`;

    const result = await model.generateContent(prompt);

    const reply = result.response.text();

    res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("Chat Error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
    
/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Grocero Backend Running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date(),
  });
});

/*
|--------------------------------------------------------------------------
| Database Test
|--------------------------------------------------------------------------
*/

app.get("/api/test-db", authMiddleware, async (req, res) => {
  try {
   const [rows] = await pool.query(
  "SELECT * FROM inventory_items WHERE user_id = ? ORDER BY created_at DESC",
  [req.user.id]
);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("DB ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Inventory Routes (Temporary)
|--------------------------------------------------------------------------
*/

app.get(
  "/api/inventory",
  authMiddleware,
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `
        SELECT *
        FROM inventory_items
        WHERE user_id = ?
        ORDER BY created_at DESC
        `,
        [req.user.id]
      );

      res.json(rows);

    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: error.message,
      });
    }
  }
);

app.post(
  "/api/inventory",
  authMiddleware,
  async (req,res)=>{
  try {
  const user_id = req.user.id;

const {
  item_name,
  quantity,
  category,
  bought_on,
  expiry_date
} = req.body;
const [existing] = await pool.query(
  `
  SELECT *
  FROM inventory_items
  WHERE user_id = ?
  AND item_name = ?
  `,
  [user_id, item_name]
);

if (existing.length > 0) {
  const [result] = await pool.query(
    `
    UPDATE inventory_items
    SET quantity = quantity + ?
    WHERE id = ?
    `,
    [
      quantity,
      existing[0].id
    ]
  );

  return res.json({
    success: true,
    message: "Quantity updated"
  });
}
    const [result] = await pool.query(
      `
      INSERT INTO inventory_items
      (
        user_id,
        item_name,
        quantity,
        category,
        bought_on,
        expiry_date
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        user_id,
        item_name,
        quantity,
        category,
        bought_on,
        expiry_date,
      ]
    );

    res.status(201).json({
      success: true,
      insertedId: result.insertId,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| ESP32 Route
|--------------------------------------------------------------------------
*/
app.get(
  "/api/device/inventory",
  authMiddleware,
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `
        SELECT
          item_name,
          quantity,
          expiry_date
        FROM inventory_items
        WHERE user_id = ?
        ORDER BY expiry_date ASC
        `,
        [req.user.id]
      );

      res.json({
        items: rows
      });

    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
);
app.get("/api/cities", (req, res) => {
  res.json(Object.keys(CITY_CONFIG));
});

app.get("/api/prices/:item", async (req, res) => {
  try {
    const item = req.params.item;

    let city = req.query.city;

    if (
      !city &&
      req.query.lat &&
      req.query.lng
    ) {
      city = findNearestCity(
        Number(req.query.lat),
        Number(req.query.lng)
      );
    }

    city = city || "mumbai";

    const results = await scrapeAll(
      item,
      city
    );

    res.json(results);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
const [existing] = await pool.query(
  `
  SELECT *
  FROM users
  WHERE email = ?
  `,
  [email]

);

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
      INSERT INTO users
      (name, email, password_hash)
      VALUES (?, ?, ?)
      `,
      [name, email, hashedPassword]
    );

    res.status(201).json({
      success: true,
      userId: result.insertId,
      message: "Account created successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.put(
  "/api/inventory/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const { quantity, expiry_date } = req.body;

      const [result] = await pool.query(
        `
        UPDATE inventory_items
        SET quantity = ?,
            expiry_date = ?
        WHERE id = ?
        AND user_id = ?
        `,
        [
          quantity,
          expiry_date,
          req.params.id,
          req.user.id
        ]
      );

      res.json({
        success: true,
        affectedRows: result.affectedRows
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);             





app.delete(
  "/api/inventory/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const [result] = await pool.query(
        `
        DELETE FROM inventory_items
        WHERE id = ?
        AND user_id = ?
        `,
        [
          req.params.id,
          req.user.id
        ]
      );

      res.json({
        success: true,
        affectedRows: result.affectedRows
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);









app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = users[0];

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});
/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Grocero Backend Running`);
  console.log(`📡 Port: ${PORT}`);
});