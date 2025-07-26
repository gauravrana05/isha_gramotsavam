import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!userProfile || !allowedRoles.includes(userProfile.role))) {
      router.push("/auth/login");
    }
  }, [userProfile, loading, allowedRoles, router]);

  if (loading || !userProfile || !allowedRoles.includes(userProfile.role)) return null;

  return <>{children}</>;
};