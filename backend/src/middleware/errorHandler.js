//  Error handling middleware for Express.js
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    return res.status(400).json({
      error: "Database error",
      message: err.message,
    });
  }

  if (err.name === "PrismaClientValidationError") {
    return res.status(400).json({
      error: "Validation error",
      message: "Invalid data provided",
    });
  }

  // Axios/HTTP errors
  if (err.response) {
    return res.status(err.response.status || 500).json({
      error: err.response.data?.error || "External API error",
      message: err.response.data?.message || err.message,
    });
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation error",
      message: err.message,
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
