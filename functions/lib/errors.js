"use strict";

// Thrown by war.js / economy.js. index.js converts it to functions.https.HttpsError,
// so this logic can be unit-tested without firebase-functions installed.
class ApiError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details || {};
  }
}
function fail(code, message, details) { throw new ApiError(code, message, details); }

module.exports = { ApiError, fail };
