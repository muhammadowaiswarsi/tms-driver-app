console.log("env",process.env.EXPO_PUBLIC_BASE_URL);
export const appConfig = {
  apiUrl: process.env.EXPO_PUBLIC_BASE_URL || "http://localhost:8080/api",
  // Add other config values as needed
};
