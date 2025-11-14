// const http=require(http)//http here is not a server or a connection — it’s just a toolbox (an object that contains functions, such as createServer(), get(), etc.).
// // require("http") loads Node’s built-in HTTP module.
// // http becomes an object with functions for creating servers and handling requests. No extra install needed

// // http.createServer(handler) creates a new HTTP server object.
// // It takes a handler function (req, res) => { ... } that runs every time a client (browser) connects.
// // req (request) — an object representing the incoming client request (URL, headers, method, body stream).
// //res (response) — an object you use to send data back to the client (status, headers, body).
// const server = http.createServer((req, res) => {//Thai function builds a server instance and returns it — we store it in the variable server
//     // ...They are request and response objects created by the server for each connection.

// // Every time someone visits http://localhost:3000, Node calls your handler function and passes new req and res objects.

// // These represent that one HTTP request/response exchang
// const now = new Date();
//   res.writeHead(200, { "Content-Type": "text/html" });
//   res.end(`<h2>Current Date and Time:</h2><p>${now}</p>`);
// });

// server.listen(3000, () => console.log("Open http://localhost:3000"));

// const http = require("http");

// const server = http.createServer((req, res) => {
//   res.writeHead(200, { "Content-Type": "text/html" });
//   const dt=new Date();
//   res.write(`<h6>Todays Date :${dt}</h6>`)
//   res.write("<h1>Hello World from Node.js!</h1>");
//   res.end(JSON.stringify({ name: "Bhoomika", language: "Node.js", level: "beginner" }));
// });

// server.listen(3000, () => {
//   console.log("Server running at http://localhost:3000");
// });


// const fs = require("fs");
// const http = require("http");
// const path = require("path")

// const server = http.createServer((req, res) => {
//     console.log("Request Received for URL ", req.url);
//     let filepath = "";
//     if (req.url === '/') {
//         // res.writeHead(200, { "Content-type": "text/html" })
//         // res.end("<h1>Welcome to My Node.js Website</h1>");
//         filepath = path.join(__dirname, "pages", "index.html")
//     } else
//     if (req.url === '/about') {
//         filepath = path.join(__dirname, "pages", "about.html");

//         // res.writeHead(200, { "Content-type": "text/html" });
//         // res.end("<h1>About Us</h1><p>This is my first node js project </p>")
//     } else if (req.url === "/contact") {
//         filepath = path.join(__dirname, "pages", "contact.html");
//         // res.writeHead(200, { "content-type": "text/html" })
//         // res.end("<h1>Contact Me</h1><p>Email :bhoomikabhoomi9645@gmail.com</p>")
//     } else {
//         filepath = path.join(__dirname, "pages", "404.html");
//         // res.writeHead(404, { "Content-type": "text/html" });
//         // res.end("<h1>Page Not found</h1>")
//     }

//     fs.readFile(filepath, (err, data) => { //read the file
//         if (err) {
//             res.writeHead(500, { "Content-Type": "text/plain" });
//             res.end("Server Error");
//         } else {
//             res.writeHead(200, { "Content-Type": "text/html" });
//             res.end(data);
//         }
//     })



// });

// server.listen(3000, () => {
//     console.log("Server running at http://localhost:3000");
// });



const fs = require("fs");
const http = require("http");
const path = require("path");

const server = http.createServer((req, res) => {
    console.log("Request received for URL:", req.url);

    let filePath = "";
    let contentType = "text/html";

    // ✅ Serve files from public folder (CSS, JS, images)
    if (req.url.startsWith("/public/")) { //this will call once exceute html link rel
        filePath = path.join(__dirname, req.url);
    } else {
        // ✅ Serve HTML pages from pages folder
        if (req.url === "/") {
            filePath = path.join(__dirname, "pages", "index.html");
        } else if (req.url === "/events") {
            filePath = path.join(__dirname, "pages", "events.html");
        } else if (req.url === "/register") {
            filePath = path.join(__dirname, "pages", "register.html");
        } else if (req.url === "/menu") {
            filePath = path.join(__dirname, "pages", "menu.html");
        } else {
            filePath = path.join(__dirname, "pages", "404.html");
        }
    }

    // ✅ Detect file extension for proper Content-Type
    const ext = path.extname(filePath);
    switch (ext) {
        case ".css":
            contentType = "text/css";
            break;
        case ".js":
            contentType = "application/javascript";
            break;
        case ".png":
        case ".jpg":
        case ".jpeg":
            contentType = "image/jpeg";
            break;
        default:
            contentType = "text/html";
    }

    // ✅ Read and serve the file
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Server Error");
        } else {
            res.writeHead(200, { "Content-Type": contentType });
            res.end(data);
        }
    });
});

server.listen(3000, () => {
    console.log("✅ Server running at http://localhost:3000");
});