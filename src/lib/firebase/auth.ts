import { signOut } from "firebase/auth";
import { auth } from "./config";

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    // Error handling removed
    throw error;
  }
};