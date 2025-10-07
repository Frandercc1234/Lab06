"use strict";

// Imports
const express = require("express");
const session = require("express-session");
const ExpressOIDC = require("@okta/oidc-middleware").ExpressOIDC;
const { auth } = require("express-openid-connect");
const { requiresAuth } = require("express-openid-connect");
const cons = require("consolidate");
const path = require("path");
require("dotenv").config(); // Import dotenv to load environment variables

let app = express();

// Globals
const OKTA_ISSUER_URI = process.env.OKTA_ISSUER_URI;
const OKTA_CLIENT_ID = process.env.OKTA_CLIENT_ID;
const OKTA_CLIENT_SECRET = process.env.OKTA_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const PORT = process.env.PORT || "3000";
const SECRET = process.env.SECRET;
const BASEURL = process.env.BASEURL;

// Esto se los dará Okta.
const config = {
  authRequired: false,
  auth0Logout: true,
  secret: SECRET,
  baseURL: process.env.BASEURL,
  clientID: OKTA_CLIENT_ID,
  issuerBaseURL: OKTA_ISSUER_URI,
};

let oidc = new ExpressOIDC({
  issuer: OKTA_ISSUER_URI,
  client_id: OKTA_CLIENT_ID,
  client_secret: OKTA_CLIENT_SECRET,
  appBaseUrl: process.env.BASEURL,
  redirect_uri: REDIRECT_URI,

  routes: {
    callback: {
      path: "/authorization-code/callback", // ← ruta explícita
      defaultRedirect: "/dashboard",
    },
  },
  scope: "openid profile",
});

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

// MVC View Setup
app.engine("html", cons.swig);
app.set("views", path.join(__dirname, "views"));
app.set("models", path.join(__dirname, "models"));
app.set("view engine", "html");

// App middleware
app.use("/static", express.static("static"));

app.use(
  session({
    cookie: { httpOnly: true },
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// App routes
app.use(oidc.router);

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/dashboard", requiresAuth(), (req, res) => {
  var payload = Buffer.from(
    req.appSession.id_token.split(".")[1],
    "base64"
  ).toString("utf-8");
  const userInfo = JSON.parse(payload);
  res.render("dashboard", { user: userInfo });
});

// Removed timeout setting as it's not needed

oidc.on("ready", () => {
  console.log("Server running on port: " + PORT);
  app.listen(parseInt(PORT));
});

oidc.on("error", (err) => {
  console.error(err);
});
