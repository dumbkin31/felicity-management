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

function forumMessagesCol() {
  return getDB().collection("forumMessages");
}

function passwordResetRequestsCol() {
  return getDB().collection("passwordResetRequests");
}

function feedbackCol() {
  return getDB().collection("feedback");
}

module.exports = { 
  participantsCol, 
  organizersCol, 
  adminsCol, 
  eventsCol, 
  registrationsCol,
  forumMessagesCol,
  passwordResetRequestsCol,
  feedbackCol
};
