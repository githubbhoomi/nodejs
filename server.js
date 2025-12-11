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
// app.get("/session-user", (req, res) => {
//     if (!req.session.user) return res.json({ username: "Unknown" });

//     res.json({ username: req.session.user.username });
// });


app.get("/session-user", (req, res) => {
    if (!req.session.user) {
        return res.json({ username: null, role: null });
    }

    res.json({
        username: req.session.user.username,
        role: req.session.user.role
    });
});




const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "bhoomindevadiga@gmail.com",
        pass: "tvyc xtoy xzte dilc"
    }
});



app.get("/login", (req, res) => {
    // req.session.user = {
    //     id: user.id,
    //     username: user.username,
    //     role: user.role // 👈 MUST HAVE THIS
    // };

    res.sendFile(path.join(__dirname, "pages", "login.html"));
});
// Serve HTML pages
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "index.html"));
});


// app.get("/", (req, res) => {
//     fs.readFile("index.html", "utf8", (err, data) => {
//         if (err) return res.status(500).send("Error loading file");
//         res.send(data);
//     });
// });


// app.get("/events", (req, res) => {
//     res.sendFile(path.join(__dirname, "pages", "events.html"));
// });

// app.get("/menu", (req, res) => {
//     res.sendFile(path.join(__dirname, "pages", "menu.html"));
// });

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
        // if (user.role === "admin") {
        //     return res.redirect("/dashboard");
        // } else {
        //     return res.redirect("/index");
        // }
        console.log(user.role)
        res.redirect("/dashboard");

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

app.post("/booking", (req, res) => {
    const { name, email, phone, eventType, eventDate, message } = req.body;

    const mysqlDate = eventDate.split("-").reverse().join("-");

    const checkQuery = "SELECT * FROM event_bookings WHERE event_date = ? LIMIT 1";

    db.get(checkQuery, [mysqlDate], (err, row) => {
        if (err) {
            return res.send(`<script>alert("Database Error!"); window.location.href='/booking';</script>`);
        }

        if (row) {
            return res.send(`<script>alert("❌ This date (${eventDate}) is already booked!"); window.location.href='/booking';</script>`);
        }

        const insertQuery = `
            INSERT INTO event_bookings (name, email, phone, event_type, event_date, message)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.run(insertQuery, [name, email, phone, eventType, mysqlDate, message], function(err2) {
            if (err2) {
                return res.send(`<script>alert("Error saving booking!"); window.location.href='/booking';</script>`);
            }

            // --------------------------------------
            // 1️⃣ Fetch admin emails from DB
            // --------------------------------------
            const adminQuery = "SELECT email FROM users WHERE role = 'admin'";

            db.all(adminQuery, [], (err3, admins) => {
                if (err3) {
                    console.error("Admin fetch error:", err3);
                } else {
                    const adminEmails = admins.map(a => a.email);

                    // Send emails to all admins
                    if (adminEmails.length > 0) {
                        const adminMail = {
                            from: "bhoomindevadiga@gmail.com",
                            to: adminEmails.join(","), // send to all admins
                            subject: "New Booking Received",
                            html: `
                                <h3>New Booking Received</h3>
                                <p><b>Name:</b> ${name}</p>
                                <p><b>Event Date:</b> ${eventDate}</p>
                                <p><b>Event Type:</b> ${eventType}</p>
                                <p><b>Phone:</b> ${phone}</p>
                            `
                        };

                        transporter.sendMail(adminMail).catch(console.error);
                    }
                }

                // --------------------------------------
                // 2️⃣ Send confirmation email to user
                // --------------------------------------
                const userMail = {
                    from: "bhoomindevadiga@gmail.com",
                    to: email,
                    subject: "Booking Confirmed",
                    html: `
                        <h2>Booking Confirmed</h2>
                        <p>Your booking for <b>${eventDate}</b> is confirmed.</p>
                        <p>Thank you, <br>${name}!</p>
                    `
                };

                transporter.sendMail(userMail).catch(console.error);

                // --------------------------------------
                // 3️⃣ Send final response only once
                // --------------------------------------
                return res.send(`
                    <script>
                        alert("✅ Booking Confirmed! Emails sent to you and admin(s).");
                        window.location.href = "/booking";
                    </script>
                `);
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
                res.send(`  <script>
                alert(" ${username} User Added Successfully!");
                window.location.href = "/add-user-page";
            </script>`);

            }
        );

    } catch (err) {
        res.send("Error: " + err.message);
    }
});




app.post("/add-menu", (req, res) => {
    const { name, type, price, description } = req.body;
    const crt_by = req.session.user.username;; // currently logged-in admin
    const upd_by = req.session.user.username;;

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
                res.send(`  <script>
                alert(" ${name} Menu Item Added Successfully!");
                window.location.href = "/addmenu";
            </script>`);

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
            res.send(` <script>
            alert("Event ${event}Registered !");
        </script>`);

        }
    );
});


// Route to serve the add menu page
app.get("/add-menu-page", (req, res) => {
    res.sendFile(path.join(__dirname, "add_menu.html"));
});


// app.get("/menu", (req, res) => {
//     db.all("SELECT * FROM menu_items", [], (err, rows) => {
//         if (err) return res.send("Error: " + err.message);

//         let html = `
//         <!DOCTYPE html>
//         <html lang="en">
//         <head>
//             <meta charset="UTF-8">
//             <title>Our Menu</title>
//             <style>
//                 body { font-family: Arial, sans-serif; }
//                 .menu-container { display: flex; flex-wrap: wrap; gap: 20px; }
//                 .menu-card {
//                     border: 1px solid #ccc;
//                     border-radius: 8px;
//                     padding: 10px;
//                     width: 250px;
//                     box-shadow: 2px 2px 8px rgba(0,0,0,0.1);
//                     transition: transform 0.2s;
//                 }
//                 .menu-card:hover { transform: scale(1.05); }
//                 .menu-card img {
//                     width: 100%;
//                     height: 150px;
//                     object-fit: cover;
//                     border-radius: 5px;
//                 }
//                 .menu-card h3 { margin: 5px 0; }
//                 .menu-card p { margin: 3px 0; }
//             </style>
//         </head>
//         <body>
//             <h1>Our Menu</h1>
//             <div class="menu-container">
//         `;

//         rows.forEach(item => {
//             html += `
//             <div class="menu-card">
//                 <img src="/images/${item.photo}" alt="${item.name}">
//                 <h3>${item.name} (${item.type})</h3>
//                 <p>${item.description}</p>
//                 <p><strong>Price:</strong> ₹${item.price}</p>
//             </div>
//             `;
//         });

//         html += `
//             </div>
//         </body>
//         </html>
//         `;

//         res.send(html);
//     });
// });

app.get("/menu", (req, res) => {
    db.all("SELECT * FROM menu_items ORDER BY type, name", (err, rows) => {
        if (err) return res.send("Database Error");

        // Group items by type
        let groups = {};

        rows.forEach(item => {
            if (!groups[item.type]) groups[item.type] = [];
            groups[item.type].push(item);
        });

        // Build HTML
        let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Menu - Royal Events & Catering</title>
            <style>
                body {
                    margin: 0;
                    font-family: Arial, sans-serif;
                    background: #f7f7f7;
                }

                header {
                    background: #2c3e50;
                    padding: 15px;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                header .logo {
                    font-size: 22px;
                    font-weight: bold;
                }

                nav a {
                    color: white;
                    margin-left: 20px;
                    text-decoration: none;
                }

                nav a.active {
                    font-weight: bold;
                    border-bottom: 2px solid #fff;
                }

                .page-hero {
                    text-align: center;
                    padding: 40px;
                    background: #f1f1f1;
                }

                .page-hero h1 {
                    margin: 0;
                    font-size: 34px;
                }

                .menu-section {
                    max-width: 100%;
                    margin: 30px 36px;
                    // padding: 0 20px;
                }

                .menu-section h2 {
                    margin-top: 40px;
                    font-size: 26px;
                    color: #333;
                }

                .menu-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-top: 15px;
                }

                .dish-card {
                    background: white;
                    padding: 15px;
                    width:200px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    transition: transform 0.3s;
                }

                .dish-card:hover {
                    transform: scale(1.03);
                }

                .dish-card img {
                    width: 100%;
                    height: 150px;
                    border-radius: 8px;
                    object-fit: cover;
                }

                .dish-card .name {
                    font-size: 18px;
                    font-weight: bold;
                    margin-top: 10px;
                }

                .dish-card .desc {
                    font-size: 14px;
                    color: #444;
                }

                .dish-card .price {
                    margin-top: 8px;
                    font-weight: bold;
                }

                footer {
                    margin-top: 50px;
                    text-align: center;
                    padding: 15px;
                    background: #2c3e50;
                    color: white;
                }
                .order-btn {
                    margin-top: 10px;
                    width: 100%;
                    padding: 10px;
                    background: #ff8800;
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                }
                
                .order-btn:hover {
                    background: #e67600;
                }
                
            </style>
        </head>

        <body>

        <header>
            <div class="logo">🎉 Royal Events & Catering</div>
            <nav>
                <a href="/">Home</a>
                <a href="/events">Events</a>
                <a href="/menu" class="active">Menu</a>
                <a href="/booking">Book Now</a>
                <a href="/contact">Contact</a>
            </nav>
        </header>

        <section class="page-hero">
            <h1>Our Catering Menu</h1>
            <p>Handcrafted dishes for every celebration.</p>
        </section>

        <section class="menu-section">
        `;

        // Add grouped sections
        for (let type in groups) {
            html += `<h2>${type}</h2><div class="menu-grid">`;

            groups[type].forEach(item => {
                html += `
                <div class="dish-card">
    <img src="/images/${item.photo}" alt="${item.name}">
    <div class="name">${item.name}</div>
    <div class="desc">${item.description}</div>
    <div class="price">₹${item.price}</div>

    <form action="/order-details" method="POST">
        <input type="hidden" name="item" value="${item.name}">
        <input type="hidden" name="price" value="${item.price}">
        <button type="submit" class="order-btn">Order Now</button>
    </form>
</div>

                `;
            });

            html += `</div>`;
        }

        html += `
        </section>

        <footer>
            © 2025 Royal Events & Catering | Designed by Bhoomika 💫
        </footer>

        </body>
        </html>
        `;

        res.send(html);
    });
});


app.post("/order-details", (req, res) => {
    const { item, price } = req.body;

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Confirm Order - Royal Catering</title>

        <style>
            body {
                margin: 0;
                font-family: Arial, sans-serif;
                background: #f7f7f7;
            }

            header {
                background: #2c3e50;
                padding: 15px;
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            header .logo {
                font-size: 22px;
                font-weight: bold;
            }

            nav a {
                color: white;
                margin-left: 20px;
                text-decoration: none;
            }

            nav a.active {
                font-weight: bold;
                border-bottom: 2px solid #fff;
            }

            .container {
                max-width: 600px;
                margin: 40px auto;
                padding: 25px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }

            h1 {
                text-align: center;
                color: #333;
            }

            p {
                font-size: 18px;
            }

            label {
                font-size: 16px;
                font-weight: bold;
            }

            input[type="number"], textarea {
                width: 100%;
                padding: 10px;
                border: 1px solid #ccc;
                border-radius: 6px;
                margin-top: 5px;
                margin-bottom: 20px;
                font-size: 16px;
            }

            textarea {
                height: 120px;
                resize: none;
            }

            .submit-btn {
                width: 100%;
                padding: 12px;
                background: #ff8800;
                border: none;
                border-radius: 8px;
                color: white;
                font-size: 18px;
                cursor: pointer;
                transition: 0.3s;
            }

            .submit-btn:hover {
                background: #e67600;
            }

            .back-link {
                display: block;
                text-align: center;
                margin-top: 15px;
                font-size: 16px;
                text-decoration: none;
                color: #2c3e50;
            }

            footer {
                margin-top: 50px;
                text-align: center;
                padding: 15px;
                background: #2c3e50;
                color: white;
            }
        </style>
    </head>

    <body>

        <header>
            <div class="logo">🎉 Royal Events & Catering</div>
            <nav>
                <a href="/">Home</a>
                <a href="/events">Events</a>
                <a href="/menu">Menu</a>
                <a href="/booking">Book Now</a>
                <a href="/contact">Contact</a>
            </nav>
        </header>

        <div class="container">
            <h1>Confirm Your Order</h1>

            <p><b>Item:</b> ${item}</p>
            <p><b>Price:</b> ₹${price}</p>

            <form action="/order" method="POST">
                <input type="hidden" name="item" value="${item}">
                <input type="hidden" name="price" value="${price}">

                <label>Quantity</label>
                <input type="number" name="qty" min="1" required>

                <label>Delivery Address</label>
                <textarea name="address" required></textarea>

                <button type="submit" class="submit-btn">Place Order</button>
            </form>

            <a href="/menu" class="back-link">⬅ Back to Menu</a>
        </div>

        <footer>
            © 2025 Royal Events & Catering | Designed by Bhoomika 💫
        </footer>

    </body>
    </html>
    `);
});


// app.post("/order", (req, res) => {
//     const session_id = req.sessionID; // Unique ID per visitor
//     const { item, price } = req.body;

//     db.run(
//         `INSERT INTO orders (session_id, item, price, order_time)
//          VALUES (?, ?, ?, datetime('now'))`, [session_id, item, price],
//         function(err) {
//             if (err) {
//                 console.log("Order error:", err);
//                 return res.send("Order failed!");
//             }

//             res.send(`
//                 <h2>Order Placed Successfully!</h2>
//                 <p>Item: ${item}</p>
//                 <p>Price: ₹${price}</p>
//                 <p>Your Order ID: ${this.lastID}</p>
//                 <br>
//                 <a href="/my-orders">View My Orders</a><br>
//                 <a href="/menu">Continue Ordering</a>
//             `);
//         }
//     );
// });

app.post("/order", (req, res) => {
    const session_id = req.sessionID;
    const { item, price, qty, address } = req.body;

    db.run(
        `INSERT INTO orders (session_id, item, price, quantity, address, order_time)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`, [session_id, item, price, qty, address],
        function(err) {
            if (err) {
                console.log("Order error:", err);
                return res.send(` <script>
                alert("Order Failed !");
            </script>`);
            }

            const orderId = this.lastID;

            res.send(`
            <div style="
                max-width: 450px;
                margin: 40px auto;
                padding: 25px;
                background: #ffffff;
                border-radius: 15px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                font-family: Arial, sans-serif;
                text-align: center;
            ">
                <h2>Select Payment Method</h2>

                <form action="/pay-online" method="POST">
                    <input type="hidden" name="orderId" value="${orderId}">
                    <button style="
                        padding: 12px 20px;
                        background: #007bff;
                        border: none;
                        color: white;
                        border-radius: 8px;
                        margin-top: 10px;
                        width: 100%;
                        cursor: pointer;
                        font-size: 16px;
                    ">Pay Online (GPay)</button>
                </form>

                <form action="/cod" method="POST">
                    <input type="hidden" name="orderId" value="${orderId}">
                    <button style="
                        padding: 12px 20px;
                        background: #28a745;
                        border: none;
                        color: white;
                        border-radius: 8px;
                        margin-top: 10px;
                        width: 100%;
                        cursor: pointer;
                        font-size: 16px;
                    ">Cash on Delivery</button>
                </form>
            </div>
        `);
        }
    );
});

app.post("/pay-online", (req, res) => {
    const { item, price, qty, address } = req.body;

    const upiId = "yourupiid@oksbi";
    const receiverName = "Royal Events & Catering";

    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(receiverName)}&am=${price}&cu=INR&tn=Order`;

    res.send(`
        <h2>Pay Online</h2>
        <p>Click the button below to pay using Google Pay or any UPI app.</p>

        <a href="${upiLink}" style="
            display: inline-block;
            padding: 12px 20px;
            background: #007bff;
            color: white;
            border-radius: 10px;
            text-decoration: none;
            font-size: 18px;
        ">
            Pay ₹${price} with UPI
        </a>

        <p style="margin-top:20px;">After payment, click the button below:</p>

        <a href="/payment-success?item=${item}&price=${price}&qty=${qty}&address=${address}&mode=Online"
            style="padding:12px 18px; background:#28a745; color:white; border-radius:8px; text-decoration:none;">
            I Have Completed Payment
        </a>
    `);
});

app.get("/payment-success", (req, res) => {
    const { orderId, mode } = req.query;

    db.get(`SELECT price FROM orders WHERE id = ?`, [orderId], (err, order) => {
        if (err || !order) return res.send("Order not found");

        db.run(
            `INSERT INTO payments (order_id, amount, mode, status, payment_time)
             VALUES (?, ?, ?, ?, datetime('now'))`, [orderId, order.price, mode, "Paid"],
            function(err) {
                if (err) return res.send("Error saving payment");

                res.redirect("/order-placed?orderId=" + orderId);
            }
        );
    });
});

app.post("/cod", (req, res) => {
    const { orderId } = req.body;

    db.get(`SELECT price FROM orders WHERE id = ?`, [orderId], (err, order) => {
        if (err || !order) return res.send("Order not found");

        db.run(
            `INSERT INTO payments (order_id, amount, mode, status, payment_time)
             VALUES (?, ?, ?, ?, datetime('now'))`, [orderId, order.price, "COD", "Pending"],
            function(err) {
                if (err) return res.send("Error saving payment");

                res.redirect("/order-placed?orderId=" + orderId);
            }
        );
    });
});

app.get("/order-placed", (req, res) => {
    const orderId = req.query.orderId;

    db.get(`
        SELECT o.*, p.mode, p.status 
        FROM orders o
        LEFT JOIN payments p ON o.id = p.order_id
        WHERE o.id = ?
    `, [orderId], (err, row) => {
        if (err || !row) return res.send("Order not found");

        res.send(`
        <div style="
            max-width: 450px;
            margin: 40px auto;
            padding: 25px;
            background: #ffffff;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
            text-align: center;
        ">
            <h2 style="color: #28a745;">✔ Order Placed Successfully!</h2>

            <p><b>Order ID:</b> ${row.id}</p>
            <p><b>Item:</b> ${row.item}</p>
            <p><b>Price:</b> ₹${row.price}</p>
            <p><b>Quantity:</b> ${row.quantity}</p>
            <p><b>Address:</b> ${row.address}</p>
            <p><b>Payment Mode:</b> ${row.mode}</p>
            <p><b>Payment Status:</b> ${row.status}</p>

            <br>
            <a href="/my-orders">View My Orders</a><br>
            <a href="/menu">Continue Ordering</a>
        </div>
    `);
    });
});

app.get("/payment-history", (req, res) => {
    db.all(`
        SELECT p.*, o.item, o.quantity
        FROM payments p
        LEFT JOIN orders o ON p.order_id = o.id
        ORDER BY p.payment_time DESC
    `, (err, rows) => {
        if (err) return res.send("Error loading history");

        let html = `
            <h2>Payment History</h2>
            <table border="1" cellpadding="8">
                <tr>
                    <th>Order ID</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
        `;

        rows.forEach(r => {
            html += `
                <tr>
                    <td>${r.order_id}</td>
                    <td>${r.item}</td>
                    <td>${r.quantity}</td>
                    <td>₹${r.amount}</td>
                    <td>${r.mode}</td>
                    <td>${r.status}</td>
                    <td>${r.payment_time}</td>
                </tr>
            `;
        });

        html += "</table>";
        res.send(html);
    });
});

// app.get("/my-orders", (req, res) => {
//     const session_id = req.sessionID;

//     db.all(
//         "SELECT * FROM orders WHERE session_id = ? ORDER BY id DESC", [session_id],
//         (err, rows) => {
//             if (err) return res.send("Error loading orders");

//             let html = `
//             <!DOCTYPE html>
//             <html lang="en">
//             <head>
//                 <meta charset="UTF-8">
//                 <title>My Orders - Royal Events & Catering</title>
//                 <style>
//                     body {
//                         margin: 0;
//                         font-family: Arial, sans-serif;
//                         background: #f7f7f7;
//                     }

//                     header {
//                         background: #2c3e50;
//                         padding: 15px;
//                         color: white;
//                         display: flex;
//                         justify-content: space-between;
//                         align-items: center;
//                     }

//                     header .logo {
//                         font-size: 22px;
//                         font-weight: bold;
//                     }

//                     header nav a {
//                         color: white;
//                         margin-left: 20px;
//                         text-decoration: none;
//                     }

//                     .orders-container {
//                         max-width: 900px;
//                         margin: 30px auto;
//                         padding: 20px;
//                     }

//                     h2 {
//                         text-align: center;
//                         margin-bottom: 25px;
//                     }

//                     .order-card {
//                         background: white;
//                         border-radius: 10px;
//                         padding: 15px;
//                         box-shadow: 0 2px 10px rgba(0,0,0,0.1);
//                         margin-bottom: 20px;
//                         display: flex;
//                         justify-content: space-between;
//                         align-items: center;
//                     }

//                     .order-info {
//                         font-size: 16px;
//                     }

//                     .order-info b {
//                         font-size: 18px;
//                     }

//                     .order-time {
//                         color: #555;
//                         font-size: 14px;
//                     }

//                     .back-btn {
//                         display: block;
//                         width: 200px;
//                         margin: 20px auto;
//                         text-align: center;
//                         padding: 10px;
//                         background: #2c3e50;
//                         color: white;
//                         text-decoration: none;
//                         border-radius: 8px;
//                         font-size: 16px;
//                     }

//                 </style>
//             </head>
//             <body>

//             <header>
//                 <div class="logo">🎉 Royal Events & Catering</div>
//                 <nav>
//                     <a href="/">Home</a>
//                     <a href="/events">Events</a>
//                     <a href="/menu">Menu</a>
//                     <a href="/booking">Book Now</a>
//                     <a href="/contact">Contact</a>
//                 </nav>
//             </header>

//             <div class="orders-container">
//                 <h2>My Orders</h2>
//             `;

//             if (rows.length === 0) {
//                 html += `
//                     <h3 style="text-align:center;">No orders found!</h3>
//                     <a class="back-btn" href="/menu">Go to Menu</a>
//                 `;
//                 html += `</div></body></html>`;
//                 return res.send(html);
//             }

//             rows.forEach(order => {
//                 html += `
//                     <div class="order-card">
//                         <div class="order-info">
//                             <b>${order.item}</b><br>
//                             ₹${order.price} × ${order.quantity}<br>
//                             <span class="order-time">${order.order_time}</span>
//                         </div>

//                         <div>
//                             <span style="background: #27ae60; padding: 5px 12px; color: white; border-radius: 6px;">
//                                 ✔ Ordered
//                             </span>
//                         </div>
//                     </div>
//                 `;
//             });

//             html += `
//                 <a class="back-btn" href="/menu">Back to Menu</a>
//             </div>

//             </body>
//             </html>
//             `;

//             res.send(html);
//         }
//     );
// });
app.get("/my-orders", (req, res) => {
    const session_id = req.sessionID;

    db.all(
        "SELECT * FROM orders WHERE session_id = ? ORDER BY id DESC", [session_id],
        (err, rows) => {
            if (err) return res.send("Error loading orders");

            let html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>My Orders - Royal Events & Catering</title>
                <style>
                    body { margin:0; font-family: Arial; background:#f3f4f6; }

                    header {
                        background:#2c3e50;
                        padding:15px;
                        color:white;
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                    }

                    header a {
                        color:white;
                        margin-left:15px;
                        text-decoration:none;
                        font-weight:bold;
                    }

                    .orders-container {
                        max-width:900px;
                        margin:30px auto;
                        padding:20px;
                    }

                    h2 {
                        margin-bottom:20px;
                    }

                    .order-card {
                        background:white;
                        padding:15px;
                        border-radius:12px;
                        margin-bottom:20px;
                        display:flex;
                        gap:15px;
                        box-shadow:0 3px 12px rgba(0,0,0,0.1);
                        align-items:center;
                    }

                    .order-img {
                        width:120px;
                        height:120px;
                        object-fit:cover;
                        border-radius:10px;
                        border:1px solid #ddd;
                    }

                    .order-details {
                        flex:1;
                    }

                    .total {
                        background:#2ecc71;
                        color:white;
                        padding:6px 12px;
                        font-size:14px;
                        border-radius:6px;
                        display:inline-block;
                        margin-top:5px;
                    }

                    small {
                        color:#666;
                    }
                </style>
            </head>

            <body>
            <header>
                <div class="logo">🎉 Royal Events & Catering</div>
                <nav>
                    <a href="/">Home</a>
                    <a href="/events">Events</a>
                    <a href="/menu">Menu</a>
                </nav>
            </header>

            <div class="orders-container">
                <h2>My Orders</h2>
            `;

            if (rows.length === 0) {
                html += `<h3>No orders yet</h3></div></body></html>`;
                return res.send(html);
            }

            rows.forEach(order => {
                const total = order.price * order.quantity;

                html += `
                <div class="order-card">
                    <img src="/images/${order.item}.jpg" class="order-img" onerror="this.src='/default-food.jpg'">

                    <div class="order-details">
                        <h3>${order.item}</h3>
                        <p>₹${order.price} × ${order.quantity}</p>
                        <div class="total">Total: ₹${total}</div>
                        <p><b>Address:</b> ${order.address}</p>
                        <small>Ordered on: ${order.order_time}</small>
                    </div>
                </div>`;
            });

            html += `</div></body></html>`;
            res.send(html);
        }
    );
});






app.get("/events", (req, res) => {
    const session_id = req.sessionID;

    db.all(
        "SELECT * FROM event_bookings  ORDER BY id DESC",
        (err, rows) => {
            if (err) return res.send(`Error loading orders : ${err.message}`);

            let html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>My Orders - Royal Events & Catering</title>
                <style>
                    body { margin:0; font-family: Arial; background:#f3f4f6; }

                    header {
                        background:#2c3e50;
                        padding:15px;
                        color:white;
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                    }

                    header a {
                        color:white;
                        margin-left:15px;
                        text-decoration:none;
                        font-weight:bold;
                    }

                    .orders-container {
                        max-width:900px;
                        margin:30px auto;
                        padding:20px;
                    }

                    h2 {
                        margin-bottom:20px;
                    }

                    .order-card {
                        background:white;
                        padding:15px;
                        border-radius:12px;
                        margin-bottom:20px;
                        display:flex;
                        gap:15px;
                        box-shadow:0 3px 12px rgba(0,0,0,0.1);
                        align-items:center;
                    }

                    .order-img {
                        width:120px;
                        height:120px;
                        object-fit:cover;
                        border-radius:10px;
                        border:1px solid #ddd;
                    }

                    .order-details {
                        flex:1;
                    }

                    .total {
                        background:#2ecc71;
                        color:white;
                        padding:6px 12px;
                        font-size:14px;
                        border-radius:6px;
                        display:inline-block;
                        margin-top:5px;
                    }

                    small {
                        color:#666;
                    }
                </style>
            </head>

            <body>
            <header>
                <div class="logo">🎉 Royal Events & Catering</div>
                <nav>
                    <a href="/">Home</a>
                    <a href="/events">Events</a>
                    <a href="/addevents">Events Register</a>
                    <a href="/menu">Menu</a>
                </nav>
            </header>

            <div class="orders-container">
                <h2>My Orders</h2>
            `;
            console.log(rows.length)
            if (rows.length === 0) {
                html += `<h3>No orders yet</h3></div></body></html>`;
                return res.send(html);
            }

            rows.forEach(events => {
                // const total = events.price * order.quantity;

                html += `
                <div class="order-card">
                    <img src="/images/${events.name}.jpg" class="order-img" onerror="this.src='/default-food.jpg'">

                    <div class="order-details">
                        <h3>${events.name}</h3>
                        <p>₹${events.event_type} </p>
                        <div class="total">Total: ₹${events.date}</div>
                
                    </div>
                </div>`;
            });

            html += `</div></body></html>`;
            res.send(html);
        }
    );
});


// Start server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});