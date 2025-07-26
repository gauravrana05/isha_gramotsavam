import { useAuth } from "@/context/AuthContext";

export const useRoleCheck = (allowedRoles: string[]) => {
  const { userProfile } = useAuth();
  return userProfile && allowedRoles.includes(userProfile.role);
};