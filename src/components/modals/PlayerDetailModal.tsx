'use client';

import React from 'react';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { PlayerDocumentUpload } from "@/components/players";
import DocumentPreview from "@/components/documents/DocumentPreview";
import { formatPhoneForDisplay } from '@/lib/utils/phone';

// Types
interface TeamPlayer {
  id: string;
  userId: string;
  teamId: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsappNumber: string | null;
  dateOfBirth: Date;
  age: number;
  gender: string;
  position: 'main' | 'substitute';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string;
  addedBy: string;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string;
    role: string;
    profileComplete: boolean,
    profileImages: {
      userId: string;
      profilePhotoPath: string | null;
      aadhaarFrontPath: string | null;
      aadhaarBackPath: string | null;
      allImagesUploaded: boolean;
      verifiedBy: string | null;
      verifiedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    } | null;
  };
}

interface TeamData {
  id: string;
  name: string;
  captainId: string;
  captainName: string;
  sportId: string;
  genderCategory: string;
  status: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string | null;
  sport: {
    id: string;
    name: string;
    mainPlayersCount: number;
    maxSubstitutes: number;
  };
}

interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayer: TeamPlayer | null;
  teamData: TeamData | null;
  isReadOnly: boolean;
  onMakeCaptain?: (playerId: string) => void;
  onDocumentUploadSuccess?: (playerId: string, documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack', url: string) => Promise<void>;
  onProfileComplete?: (playerId: string, isComplete: boolean) => void;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  isOpen,
  onClose,
  selectedPlayer,
  teamData,
  isReadOnly,
  onMakeCaptain,
  onDocumentUploadSuccess,
  onProfileComplete
}) => {
  if (!selectedPlayer || !teamData) return null;

  const handleMakeCaptainClick = () => {
    if (onMakeCaptain && selectedPlayer) {
      onMakeCaptain(selectedPlayer.id);
    }
  };

  const handleDocumentUploadSuccess = async (playerId: string, documentType: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack', url: string) => {
    if (onDocumentUploadSuccess) {
      await onDocumentUploadSuccess(playerId, documentType, url);
    }
  };

  const handleProfileComplete = (playerId: string, isComplete: boolean) => {
    if (onProfileComplete) {
      onProfileComplete(playerId, isComplete);
    }
  };

  // Footer buttons
  const footer = (
    <div className="flex flex-row space-x-3 sm:justify-end">
      <button
        onClick={onClose}
        className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
      >
        Close
      </button>
      {/* Make Captain button - disabled for current captain */}
      {selectedPlayer.userId !== teamData.captainId && !isReadOnly && onMakeCaptain ? (
        <button
          onClick={handleMakeCaptainClick}
          className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm"
        >
          Make Captain
        </button>
      ) : (
        <button
          className="flex-1 sm:flex-initial sm:px-4 bg-gray-400 text-white rounded-lg cursor-not-allowed transition-colors font-medium py-2 text-sm"
          disabled
        >
          {selectedPlayer.userId === teamData.captainId ? 'Already Captain' : 'Cannot Make Captain (Team Submitted)'}
        </button>
      )}
    </div>
  );

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${selectedPlayer.firstName} ${selectedPlayer.lastName}`}
      subtitle={formatPhoneForDisplay(selectedPlayer.phone)}
      size="xl"
      mobileFullScreen={true}
      scrollableBody={true}
      footer={footer}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Player Information */}
        <div>
          <h3 className="text-lg font-bold text-[#4A2F1D] mb-4">Player Information</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Age</label>
                <p className="font-semibold">{selectedPlayer.age} years</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Position</label>
                <p className="font-semibold capitalize">{selectedPlayer.position}</p>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">WhatsApp Number</label>
              <p className="font-semibold">{selectedPlayer.whatsappNumber}</p>
            </div>

            <div>
              <label className="text-sm text-gray-600">Village</label>
              <p className="font-semibold">{selectedPlayer.panchayat}</p>
            </div>

            <div>
              <label className="text-sm text-gray-600">Panchayat</label>
              <p className="font-semibold">{selectedPlayer.panchayat}</p>
            </div>

            <div>
              <label className="text-sm text-gray-600">District</label>
              <p className="font-semibold">{selectedPlayer.district}</p>
            </div>
          </div>
        </div>

        {/* Document Management */}
        <div>
          <h3 className="text-lg font-bold text-[#4A2F1D] mb-4">Identity Documents</h3>
          <div className="space-y-4">

            {/* Profile Photo */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Profile Photo</span>
                <div className={`w-3 h-3 rounded-full ${selectedPlayer.user?.profileImages?.profilePhotoPath ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
              </div>
              {selectedPlayer.user?.profileImages?.profilePhotoPath && isReadOnly ? (
                <DocumentPreview
                  type="profilePhoto"
                  url={selectedPlayer.user?.profileImages.profilePhotoPath}
                  label="Profile Photo"
                  verified={!!selectedPlayer.user?.profileImages.verifiedAt}
                  showActions={false}
                  size="md"
                />
              ) : (
                <PlayerDocumentUpload
                  playerId={selectedPlayer.id}
                  playerUserId={selectedPlayer.userId}
                  documentType="profilePhoto"
                  label="Profile Photo"
                  currentUrl={selectedPlayer.user?.profileImages?.profilePhotoPath || null}
                  onSuccess={(url) => handleDocumentUploadSuccess(selectedPlayer.id, 'profilePhoto', url)}
                  onProfileComplete={(isComplete) => handleProfileComplete(selectedPlayer.id, isComplete)}
                  variant="card"
                  disabled={isReadOnly === true}
                />
              )}
            </div>

            {/* Aadhaar Front */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Aadhaar Front</span>
                <div className={`w-3 h-3 rounded-full ${selectedPlayer.user?.profileImages?.aadhaarFrontPath ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
              </div>
              {selectedPlayer.user?.profileImages?.aadhaarFrontPath && isReadOnly ? (
                <DocumentPreview
                  type="aadhaarFront"
                  url={selectedPlayer.user.profileImages.aadhaarFrontPath}
                  label="Aadhaar Front"
                  verified={!!selectedPlayer.user.profileImages.verifiedAt}
                  showActions={false}
                  size="md"
                />
              ) : (
                <PlayerDocumentUpload
                  playerId={selectedPlayer.id}
                  playerUserId={selectedPlayer.userId}
                  documentType="aadhaarFront"
                  label="Aadhaar Front"
                  currentUrl={selectedPlayer.user?.profileImages?.aadhaarFrontPath || null}
                  onSuccess={(url) => handleDocumentUploadSuccess(selectedPlayer.id, 'aadhaarFront', url)}
                  onProfileComplete={(isComplete) => handleProfileComplete(selectedPlayer.id, isComplete)}
                  variant="card"
                  disabled={isReadOnly === true}
                />
              )}
            </div>

            {/* Aadhaar Back */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Aadhaar Back</span>
                <div className={`w-3 h-3 rounded-full ${selectedPlayer.user?.profileImages?.aadhaarBackPath ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
              </div>
              {selectedPlayer.user?.profileImages?.aadhaarBackPath && isReadOnly ? (
                <DocumentPreview
                  type="aadhaarBack"
                  url={selectedPlayer.user.profileImages.aadhaarBackPath}
                  label="Aadhaar Back"
                  verified={!!selectedPlayer.user.profileImages.verifiedAt}
                  showActions={false}
                  size="md"
                />
              ) : (
                <PlayerDocumentUpload
                  playerId={selectedPlayer.id}
                  playerUserId={selectedPlayer.userId}
                  documentType="aadhaarBack"
                  label="Aadhaar Back"
                  currentUrl={selectedPlayer.user?.profileImages?.aadhaarBackPath || null}
                  onSuccess={(url) => handleDocumentUploadSuccess(selectedPlayer.id, 'aadhaarBack', url)}
                  onProfileComplete={(isComplete: boolean | undefined) => handleProfileComplete(selectedPlayer.id, isComplete === true)}
                  variant="card"
                  disabled={isReadOnly === true}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </EnhancedModal>
  );
};