const { getDB } = require("./db");

function usersCol() {
  return getDB().collection("users");
}

module.exports.usersCol = usersCol;

function eventsCol() {
  return getDB().collection("events");
}

module.exports.eventsCol = eventsCol;
