import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.FB_SERVICE_KEY) {
  throw new Error("FB_SERVICE_KEY is not defined in .env file");
}

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

export default admin;
