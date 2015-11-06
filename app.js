"use strict";

var express = require("express");
var fs = require("fs");
var request = require("request");

// config
var configVars = ["CONTACTS_BASEURL", "FUM_BASEURL", "FAVICON"];
var CONTACTS_BASEURL = process.env.CONTACTS_BASEURL || "";

// app
var app = express();

// postprocess mainjs
function readFile(fileName) {
  var c = fs.readFileSync(fileName, "utf-8");
  configVars.forEach(function (v) {
    c = c.replace("\"%%%" + v + "%%%\"", JSON.stringify(process.env[v] || ""));
  });
  return c;
}

// expand templates
var indexjs = readFile("index.html");
var mainjs = readFile("dist/main.js");

app.get("/", function (req, res) { res.send(indexjs); });
app.get("/main.js", function(req, res) { res.send(mainjs); });

// Pipe from real backend
app.get("/contacts.json", function (req, res) {
  res.setHeader("Cache-Control", "public, max-age=3600");
  request(CONTACTS_BASEURL + "/").pipe(res);
});

app.get("/avatars.json", function (req, res) {
  res.setHeader("Cache-Control", "public, max-age=3600");
  request(CONTACTS_BASEURL + "/avatars.json").pipe(res);
});

app.listen(8000);
