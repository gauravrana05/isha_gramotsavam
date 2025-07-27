import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export const AadhaarVerification: React.FC = () => {
  const { userProfile } = useAuth();

  if (!userProfile) return null;

  const status = userProfile.aadhaarStatus || "pending";

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          {status === "verified" ? (
            <CheckCircle className="w-8 h-8 text-white" />
          ) : status === "rejected" ? (
            <XCircle className="w-8 h-8 text-white" />
          ) : (
            <Clock className="w-8 h-8 text-white" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 font-roboto mb-2">
          Aadhaar Verification
        </h2>
        <p className="text-gray-600 font-roboto">
          Your Aadhaar verification status is{" "}
          <span className="font-bold capitalize">{status}</span>.
        </p>
      </div>
      {status === "pending" && (
        <p className="text-sm text-gray-600 font-roboto text-center">
          Your documents are under review. This may take 1-2 business days.
        </p>
      )}
      {status === "verified" && (
        <Button
          onClick={() => window.location.href = "/dashboard"}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-medium ripple"
          variant="large"
          aria-label="Go to dashboard"
        >
          Go to Dashboard
        </Button>
      )}
      {status === "rejected" && (
        <>
          <p className="text-sm text-red-600 font-roboto text-center">
            Verification failed. Please re-upload your Aadhaar documents.
          </p>
          <Button
            onClick={() => window.location.href = "/profile/edit"}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-lg font-medium ripple"
            variant="large"
            aria-label="Edit profile"
          >
            Edit Profile
          </Button>
        </>
      )}
    </div>
  );
};  