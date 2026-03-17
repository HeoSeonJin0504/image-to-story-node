import winston from "winston";

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.printf((info) => {
      const { timestamp, level, message, stack, ...meta } = info;
      const metaStr = Object.keys(meta).length
        ? " " + JSON.stringify(meta)
        : "";
      return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}${stack ? "\n" + stack : ""}`;
    }),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf((info) => {
          const { timestamp, level, message, stack, ...meta } = info;
          const metaStr = Object.keys(meta).length
            ? " " + JSON.stringify(meta)
            : "";
          return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}${stack ? "\n" + stack : ""}`;
        }),
      ),
    }),
  ],
});

export default logger;
