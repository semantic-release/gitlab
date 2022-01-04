module.exports = class GotPollyFillError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'GotPollyFillError';
    this.response = {};
    this.response.statusCode = statusCode;
  }
};
