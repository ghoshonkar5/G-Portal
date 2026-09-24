const logSecurityEvent = (event, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details
  };
  // Structured JSON — easy to pipe to any log aggregator later
  console.log('[SECURITY]', JSON.stringify(logEntry));
};

module.exports = { logSecurityEvent };
