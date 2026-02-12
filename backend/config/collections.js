const { getDB } = require("./db");

function usersCol() {
  return getDB().collection("users");
}

module.exports = { usersCol };
