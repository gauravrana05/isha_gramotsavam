import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Phone, MapPin, Calendar, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { documentUploadService } from '@/lib/services/documentUploadService';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import Button from '@/components/ui/Button';

interface Player {
  playerId?: string;
  userId?: string;
  name: string;
  mobile: string;
  gender: string;
  age: string;
  panchayat: string;
  district: string;
  state: string;
  isProfileComplete: boolean;
  isVerified: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  verificationComments?: string;
  joinedAt: string;
  role: string;
  documents?: {
    profilePhoto?: DocumentStatus;
    aadhaarFront?: DocumentStatus;
    aadhaarBack?: DocumentStatus;
  };
}

interface DocumentStatus {
  storagePath: string;
  url?: string | null;
  verified: boolean;
  uploadedAt?: Date | null;
  uploadedBy?: string | null;
}

interface PlayerVerificationFormProps {
  player: Player;
  index: number;
  teamPanchayat: string;
  onStatusChange: (index: number, status: 'approved' | 'rejected', comments: string) => void;
}

export const PlayerVerificationForm: React.FC<PlayerVerificationFormProps> = ({
  player,
  index,
  teamPanchayat,
  onStatusChange
}) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState(player.verificationComments || '');
  
  // Document verification states
  const [documentUrls, setDocumentUrls] = useState<{[key: string]: string | null}>({
    profilePhoto: null,
    aadhaarFront: null,
    aadhaarBack: null
  });
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [documentVerifications, setDocumentVerifications] = useState<{[key: string]: boolean}>({
    profilePhoto: player.documents?.profilePhoto?.verified || false,
    aadhaarFront: player.documents?.aadhaarFront?.verified || false,
    aadhaarBack: player.documents?.aadhaarBack?.verified || false
  });

  // Load document URLs on component mount
  useEffect(() => {
    const loadDocumentUrls = async () => {
      if (!player.userId) return;
      
      try {
        const profileUrl = await documentUploadService.getDocumentURL(player.userId, 'profilePhoto');
        const aadhaarFrontUrl = await documentUploadService.getDocumentURL(player.userId, 'aadhaarFront');
        const aadhaarBackUrl = await documentUploadService.getDocumentURL(player.userId, 'aadhaarBack');
        
        setDocumentUrls({
          profilePhoto: profileUrl,
          aadhaarFront: aadhaarFrontUrl,
          aadhaarBack: aadhaarBackUrl
        });
      } catch (error) {
        console.error('Error loading document URLs:', error);
      }
    };

    loadDocumentUrls();
  }, [player.userId]);

  const handleAction = (action: 'approve' | 'reject') => {
    setModalType(action);
    setShowModal(true);
  };

  const handleDocumentVerification = async (documentType: string, verified: boolean) => {
    if (!player.userId || !user) return;

    try {
      // Update user document verification status
      const userRef = doc(db, 'users', player.userId);
      await updateDoc(userRef, {
        [`documents.${documentType}.verified`]: verified,
        [`documents.${documentType}.verifiedBy`]: user.uid,
        [`documents.${documentType}.verifiedAt`]: new Date()
      });

      // Update local state
      setDocumentVerifications(prev => ({
        ...prev,
        [documentType]: verified
      }));
    } catch (error) {
      console.error(`Error updating ${documentType} verification:`, error);
    }
  };

  const openDocumentModal = (documentType: string) => {
    setSelectedDocument(documentType);
    setShowDocumentModal(true);
  };

  const handleConfirm = () => {
    const status = modalType === 'approve' ? 'approved' : 'rejected';
    onStatusChange(index, status, comments);
    setShowModal(false);
    setComments('');
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'yellow';
    }
  };

  const validatePlayer = () => {
    const issues = [];
    
    if (player.panchayat !== teamPanchayat) {
      issues.push(`Different panchayat: ${player.panchayat} (Team: ${teamPanchayat})`);
    }
    
    const age = parseInt(player.age);
    if (age < 14 || age > 60) {
      issues.push(`Invalid age: ${age} (Must be 14-60)`);
    }
    
    if (!player.mobile || player.mobile.length !== 10) {
      issues.push('Invalid mobile number');
    }

    // Document validation
    if (!documentUrls.profilePhoto) {
      issues.push('Profile photo not uploaded');
    } else if (!documentVerifications.profilePhoto) {
      issues.push('Profile photo not verified');
    }

    if (!documentUrls.aadhaarFront) {
      issues.push('Aadhaar front not uploaded');
    } else if (!documentVerifications.aadhaarFront) {
      issues.push('Aadhaar front not verified');
    }

    if (!documentUrls.aadhaarBack) {
      issues.push('Aadhaar back not uploaded');
    } else if (!documentVerifications.aadhaarBack) {
      issues.push('Aadhaar back not verified');
    }
    
    return issues;
  };

  const validationIssues = validatePlayer();
  const hasIssues = validationIssues.length > 0;

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${hasIssues ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-lg font-semibold font-fira flex items-center">
              {player.name}
              {player.role === 'captain' && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Captain</span>
              )}
            </h4>
            <p className="text-sm text-gray-600 font-fira">Player {index + 1}</p>
          </div>
          <div className="flex items-center space-x-2">
            {player.verificationStatus && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getStatusColor(player.verificationStatus) === 'green' ? 'bg-green-100 text-green-800' :
                getStatusColor(player.verificationStatus) === 'red' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {player.verificationStatus.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            <div className="flex items-center text-sm">
              <Phone className="w-4 h-4 mr-2 text-gray-500" />
              <span className="font-fira">+91 {player.mobile}</span>
            </div>
            
            <div className="flex items-center text-sm">
              <MapPin className="w-4 h-4 mr-2 text-gray-500" />
              <span className="font-fira">{player.panchayat}, {player.district}</span>
            </div>
            
            <div className="flex items-center text-sm">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              <span className="font-fira">Age: {player.age} • Gender: {player.gender === 'M' ? 'Male' : 'Female'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-semibold font-fira">Profile Status:</span>
              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                player.isProfileComplete ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {player.isProfileComplete ? 'Complete' : 'Incomplete'}
              </span>
            </div>
            
            <div className="text-sm">
              <span className="font-semibold font-fira">Verification:</span>
              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                player.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {player.isVerified ? 'Verified' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Validation Issues */}
        {hasIssues && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
              <span className="font-semibold text-red-800 font-fira">Validation Issues:</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {validationIssues.map((issue, idx) => (
                <li key={idx} className="font-fira">• {issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Comments */}
        {player.verificationComments && (
          <div className="mb-4 p-3 bg-gray-100 border border-gray-200 rounded-lg">
            <span className="font-semibold font-fira text-gray-800">Comments:</span>
            <p className="text-sm text-gray-700 font-fira mt-1">{player.verificationComments}</p>
          </div>
        )}

        {/* Document Verification */}
        <div className="mb-4 border border-gray-200 rounded-lg p-4">
          <h5 className="font-semibold font-fira text-gray-900 mb-3">Document Verification</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Profile Photo */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium font-fira">Profile Photo</span>
                {documentVerifications.profilePhoto ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : documentUrls.profilePhoto ? (
                  <Clock className="w-4 h-4 text-yellow-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
              </div>
              {documentUrls.profilePhoto ? (
                <div className="space-y-2">
                  <button
                    onClick={() => openDocumentModal('profilePhoto')}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-fira"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Document
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDocumentVerification('profilePhoto', true)}
                      disabled={documentVerifications.profilePhoto}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:bg-green-300 font-fira"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => handleDocumentVerification('profilePhoto', false)}
                      disabled={!documentVerifications.profilePhoto}
                      className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:bg-red-300 font-fira"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-red-600 font-fira">Not uploaded</p>
              )}
            </div>

            {/* Aadhaar Front */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium font-fira">Aadhaar Front</span>
                {documentVerifications.aadhaarFront ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : documentUrls.aadhaarFront ? (
                  <Clock className="w-4 h-4 text-yellow-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
              </div>
              {documentUrls.aadhaarFront ? (
                <div className="space-y-2">
                  <button
                    onClick={() => openDocumentModal('aadhaarFront')}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-fira"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Document
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDocumentVerification('aadhaarFront', true)}
                      disabled={documentVerifications.aadhaarFront}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:bg-green-300 font-fira"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => handleDocumentVerification('aadhaarFront', false)}
                      disabled={!documentVerifications.aadhaarFront}
                      className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:bg-red-300 font-fira"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-red-600 font-fira">Not uploaded</p>
              )}
            </div>

            {/* Aadhaar Back */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium font-fira">Aadhaar Back</span>
                {documentVerifications.aadhaarBack ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : documentUrls.aadhaarBack ? (
                  <Clock className="w-4 h-4 text-yellow-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
              </div>
              {documentUrls.aadhaarBack ? (
                <div className="space-y-2">
                  <button
                    onClick={() => openDocumentModal('aadhaarBack')}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-fira"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Document
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDocumentVerification('aadhaarBack', true)}
                      disabled={documentVerifications.aadhaarBack}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:bg-green-300 font-fira"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => handleDocumentVerification('aadhaarBack', false)}
                      disabled={!documentVerifications.aadhaarBack}
                      className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:bg-red-300 font-fira"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-red-600 font-fira">Not uploaded</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {player.verificationStatus !== 'approved' && player.verificationStatus !== 'rejected' && (
          <div className="flex space-x-3">
            <Button
              onClick={() => handleAction('approve')}
              size="small"
              className="bg-green-600 hover:bg-green-700 text-white flex items-center"
              disabled={hasIssues}
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
            
            <Button
              onClick={() => handleAction('reject')}
              variant="secondary"
              size="small"
              className="bg-red-600 hover:bg-red-700 text-white flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold font-fira mb-4">
              {modalType === 'approve' ? 'Approve' : 'Reject'} Player
            </h3>
            <div className="space-y-4">
              <p className="font-fira">
                Are you sure you want to {modalType} <strong>{player.name}</strong>?
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-fira">
                  Comments {modalType === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                  placeholder={modalType === 'reject' ? 'Please provide reason for rejection' : 'Optional comments'}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowModal(false)}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  className={modalType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  disabled={modalType === 'reject' && !comments.trim()}
                >
                  Confirm {modalType === 'approve' ? 'Approval' : 'Rejection'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {showDocumentModal && selectedDocument && documentUrls[selectedDocument] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold font-fira">
                {selectedDocument === 'profilePhoto' ? 'Profile Photo' : 
                 selectedDocument === 'aadhaarFront' ? 'Aadhaar Front' : 'Aadhaar Back'}
                - {player.name}
              </h3>
              <button
                onClick={() => setShowDocumentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="text-center">
              <Image
                src={documentUrls[selectedDocument]!}
                alt={`${selectedDocument} for ${player.name}`}
                width={800}
                height={600}
                className="max-w-full max-h-[60vh] mx-auto border rounded-lg shadow-lg object-contain"
              />
            </div>

            <div className="mt-6 flex justify-center space-x-4">
              <button
                onClick={() => {
                  handleDocumentVerification(selectedDocument, true);
                  setShowDocumentModal(false);
                }}
                disabled={documentVerifications[selectedDocument]}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-300 font-fira flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Document
              </button>
              <button
                onClick={() => {
                  handleDocumentVerification(selectedDocument, false);
                  setShowDocumentModal(false);
                }}
                disabled={!documentVerifications[selectedDocument]}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:bg-red-300 font-fira flex items-center"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Document
              </button>
              <button
                onClick={() => setShowDocumentModal(false)}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 font-fira"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};