const { getDB } = require("./db");

function participantsCol() {
  return getDB().collection("participants");
}

function organizersCol() {
  return getDB().collection("organizers");
}

function adminsCol() {
  return getDB().collection("admins");
}

function eventsCol() {
  return getDB().collection("events");
}

function registrationsCol() {
  return getDB().collection("registrations");
}

module.exports = { participantsCol, organizersCol, adminsCol, eventsCol, registrationsCol };
