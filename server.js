const express = require("express");
const path = require("path");
const fileUpload = require("express-fileupload");
const bodyParser = require('body-parser');
const db = require('./database');
const session = require('express-session');

const bcrypt = require('bcrypt'); // For password hashing

const app = express();


app.use(session({
    secret: "f3b7d8c4e12fa9cd1b64be3f47d8a2c93cce1b2fe4470dbf5d91a3cc89f6b72e6c92df8f3ab441ce5f99e2e3a77d4c11", // change this to a strong key
    resave: false,
    saveUninitialized: true
}));

function isLoggedIn(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect("/login");
}


// Middleware
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileUpload());
app.use('/images', express.static(path.join(__dirname, 'public/images')));



app.get("/dashboard", isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "dashboard.html"));
});


app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});



// Route to Provide Logged-in Username
app.get("/session-user", (req, res) => {
    if (!req.session.user) return res.json({ username: "Unknown" });

    res.json({ username: req.session.user.username });
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "login.html"));
});
// Serve HTML pages
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "index.html"));
});

app.get("/events", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "events.html"));
});

app.get("/menu", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "menu.html"));
});

app.get("/contact", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "contact.html"));
});

app.get("/booking", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "booking.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "register.html"));
});


app.get("/addmenu", (req, res) => {
    res.sendFile(path.resolve(__dirname, "pages", "add_menu.html"));
});



app.get("/add-user-page", (req, res) => {
    res.sendFile(path.resolve(__dirname, "pages", "add_user.html"));
});



app.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], async(err, user) => {
        if (err) return res.send("DB Error: " + err.message);
        if (!user) return res.send("User not found");

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.send("Invalid password");

        // Store logged-in user in session
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };
        if (user.role === "admin") {
            return res.redirect("/dashboard");
        } else {
            return res.redirect("/index");
        }

        // res.redirect("/dashboard");

    });
});
//get the counts in dashboard
app.get("/api/counts", isLoggedIn, (req, res) => {
    db.get("SELECT COUNT(*) AS totalUsers FROM users", (err, userRow) => {
        db.get("SELECT COUNT(*) AS totalMenu FROM menu_items", (err2, menuRow) => {
            res.json({
                totalUsers: userRow.totalUsers,
                totalMenu: menuRow.totalMenu
            });
        });
    });
});











app.post("/add-user", async(req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.send("All fields are required");
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(
            `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, hashedPassword, role],
            function(err) {
                if (err) return res.send("DB Error: " + err.message);
                res.send(`<h3>User Added Successfully!</h3>
                          <p>ID: ${this.lastID}</p>
                          <p><a href="/add-user-page">Add Another User</a></p>`);
            }
        );

    } catch (err) {
        res.send("Error: " + err.message);
    }
});




app.post("/add-menu", (req, res) => {
    const { name, type, price, description } = req.body;
    const crt_by = adminUser; // currently logged-in admin
    const upd_by = adminUser;

    if (!req.files || !req.files.photo) {
        return res.send("Please upload a photo");
    }

    // Save uploaded image
    const photoFile = req.files.photo;
    const photoName = Date.now() + "_" + photoFile.name;
    const uploadPath = path.join(__dirname, "public/images", photoName);

    photoFile.mv(uploadPath, (err) => {
        if (err) return res.send("Error uploading image: " + err);

        // Insert into database
        db.run(
            `INSERT INTO menu_items (name, type, price, photo, description, crt_by, upd_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`, [name, type, price, photoName, description, crt_by, upd_by],
            function(err) {
                if (err) return res.send("DB Error: " + err.message);
                res.send(`<h3>Menu Item Added Successfully!</h3><p>ID: ${this.lastID}</p>
                          <p><a href="/add-menu-page">Add Another</a></p>`);
            }
        );
    });
});



//  Handle post request
app.post("/submit", (req, res) => {
    const { name, phoneno, email, event } = req.body;
    db.run(
        `INSERT INTO registrations (name, phoneno, email, event) VALUES (?, ?, ?, ?)`, [name, phoneno, email, event],
        function(err) {
            if (err) return res.send("Error: " + err.message);
            res.send(`<h2>Registered!</h2><p>ID: ${this.lastID}</p>`);
        }
    );
});


// Route to serve the add menu page
app.get("/add-menu-page", (req, res) => {
    res.sendFile(path.join(__dirname, "add_menu.html"));
});


app.get("/menu", (req, res) => {
    db.all("SELECT * FROM menu_items", [], (err, rows) => {
        if (err) return res.send("Error: " + err.message);

        let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Our Menu</title>
            <style>
                body { font-family: Arial, sans-serif; }
                .menu-container { display: flex; flex-wrap: wrap; gap: 20px; }
                .menu-card {
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    padding: 10px;
                    width: 250px;
                    box-shadow: 2px 2px 8px rgba(0,0,0,0.1);
                    transition: transform 0.2s;
                }
                .menu-card:hover { transform: scale(1.05); }
                .menu-card img {
                    width: 100%;
                    height: 150px;
                    object-fit: cover;
                    border-radius: 5px;
                }
                .menu-card h3 { margin: 5px 0; }
                .menu-card p { margin: 3px 0; }
            </style>
        </head>
        <body>
            <h1>Our Menu</h1>
            <div class="menu-container">
        `;

        rows.forEach(item => {
            html += `
            <div class="menu-card">
                <img src="/images/${item.photo}" alt="${item.name}">
                <h3>${item.name} (${item.type})</h3>
                <p>${item.description}</p>
                <p><strong>Price:</strong> ₹${item.price}</p>
            </div>
            `;
        });

        html += `
            </div>
        </body>
        </html>
        `;

        res.send(html);
    });
});

// Start server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});