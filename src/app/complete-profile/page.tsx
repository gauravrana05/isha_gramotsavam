'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth, db, storage } from '../../../utils/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function CompleteProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [panchayat, setPanchayat] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [language, setLanguage] = useState('en');
  const [aadharFront, setAadharFront] = useState<File | null>(null);
  const [aadharBack, setAadharBack] = useState<File | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [aadharFrontUrl, setAadharFrontUrl] = useState<string | null>(null);
  const [aadharBackUrl, setAadharBackUrl] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const fetchUserData = async () => {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setName(userData?.name || '');
          setVillage(userData?.village || '');
          setPanchayat(userData?.panchayat || '');
          setDistrict(userData?.district || '');
          setState(userData?.state || '');
          setLanguage(userData?.language || 'en');
          setAadharFrontUrl(userData?.aadharFrontUrl || null);
          setAadharBackUrl(userData?.aadharBackUrl || null);
          setProfilePhotoUrl(userData?.profilePhotoUrl || null);
          setIsProfileComplete(userData?.isProfileComplete || false);
        }
      };
      fetchUserData();
    }
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (fileType === 'aadharFront') {
        setAadharFront(file);
        setAadharFrontUrl(URL.createObjectURL(file));
      } else if (fileType === 'aadharBack') {
        setAadharBack(file);
        setAadharBackUrl(URL.createObjectURL(file));
      } else if (fileType === 'profilePhoto') {
        setProfilePhoto(file);
        setProfilePhotoUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!user) {
      setError('User not authenticated.');
      setSubmitting(false);
      return;
    }

    if (!name || !village || !panchayat || !district || !state) {
      setError('Please fill in all required fields.');
      setSubmitting(false);
      return;
    }

    try {
      const uploadTasks = [];
      const aadharImageUrls: { front?: string; back?: string } = {};
      const profilePhotoUrlObj: { url?: string } = {};

      if (aadharFront) {
        const aadharFrontRef = ref(storage, `aadhaar/${user.uid}/front_${aadharFront.name}`);
        const uploadTask = uploadBytes(aadharFrontRef, aadharFront).then(async (snapshot) => {
          console.log('Aadhaar front image uploaded.');
          const downloadURL = await getDownloadURL(snapshot.ref);
          aadharImageUrls.front = downloadURL;
        });
        uploadTasks.push(uploadTask);
      }

      if (aadharBack) {
        const aadharBackRef = ref(storage, `aadhaar/${user.uid}/back_${aadharBack.name}`);
        const uploadTask = uploadBytes(aadharBackRef, aadharBack).then(async (snapshot) => {
          console.log('Aadhaar back image uploaded.');
          const downloadURL = await getDownloadURL(snapshot.ref);
          aadharImageUrls.back = downloadURL;
        });
        uploadTasks.push(uploadTask);
      }

      if (profilePhoto) {
        const profilePhotoRef = ref(storage, `profilePhotos/${user.uid}/${profilePhoto.name}`);
        const uploadTask = uploadBytes(profilePhotoRef, profilePhoto).then(async (snapshot) => {
          console.log('Profile photo uploaded.');
          const downloadURL = await getDownloadURL(snapshot.ref);
          profilePhotoUrlObj.url = downloadURL;
        });
        uploadTasks.push(uploadTask);
      }

      await Promise.all(uploadTasks);

      const updateData: any = {
        name,
        village,
        panchayat,
        district,
        state,
        language,
        updatedAt: new Date(),
        isProfileComplete: true,
      };

      if (aadharImageUrls.front) updateData.aadharFrontUrl = aadharImageUrls.front;
      if (aadharImageUrls.back) updateData.aadharBackUrl = aadharImageUrls.back;
      if (profilePhotoUrlObj.url) updateData.profilePhotoUrl = profilePhotoUrlObj.url;

      await updateDoc(doc(db, 'users', user.uid), updateData);

      console.log('Profile updated successfully!');
      setIsEditing(false);
      setIsProfileComplete(true);
    } catch (err: any) {
      setError('Failed to update profile: ' + err.message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting to login...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#FF6F00]">
          {isProfileComplete && !isEditing ? 'View Your Profile' : 'Complete Your Profile'}
        </h2>

        {isProfileComplete && !isEditing ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Full Name</p>
              <p className="mt-1 text-gray-900">{name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Profile Photo</p>
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Profile" className="mt-2 w-32 h-32 object-cover rounded-md" />
              ) : (
                <p className="mt-1 text-gray-500">No profile photo</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Village</p>
              <p className="mt-1 text-gray-900">{village}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Panchayat</p>
              <p className="mt-1 text-gray-900">{panchayat}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">District</p>
              <p className="mt-1 text-gray-900">{district}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">State</p>
              <p className="mt-1 text-gray-900">{state}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Preferred Language</p>
              <p className="mt-1 text-gray-900">
                {language === 'en' ? 'English' :
                 language === 'ta' ? 'Tamil' :
                 language === 'hi' ? 'Hindi' :
                 language === 'ml' ? 'Malayalam' :
                 language === 'te' ? 'Telugu' :
                 language === 'kn' ? 'Kannada' :
                 language === 'or' ? 'Odia' : language}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Aadhaar Card Front</p>
              {aadharFrontUrl ? (
                <img src={aadharFrontUrl} alt="Aadhaar Front" className="mt-2 w-32 h-32 object-cover rounded-md" />
              ) : (
                <p className="mt-1 text-gray-500">No Aadhaar front image</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Aadhaar Card Back</p>
              {aadharBackUrl ? (
                <img src={aadharBackUrl} alt="Aadhaar Back" className="mt-2 w-32 h-32 object-cover rounded-md" />
              ) : (
                <p className="mt-1 text-gray-500">No Aadhaar back image</p>
              )}
            </div>
            <div className="flex space-x-4">
              <button
                onClick={toggleEditMode}
                className="w-full bg-[#FF6F00] text-white py-2 px-4 rounded-md hover:bg-[#E65100] focus:outline-none focus:ring-2 focus:ring-[#FFC107]"
              >
                Edit Profile
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Home
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FF6F00] focus:border-[#FF6F00]"
                required
              />
            </div>

            <div>
              <label htmlFor="profilePhoto" className="block text-sm font-medium text-gray-700">Profile Photo (Optional)</label>
              {profilePhotoUrl && (
                <div className="mt-2 mb-2">
                  <img src={profilePhotoUrl} alt="Profile Preview" className="w-32 h-32 object-cover rounded-md" />
                </div>
              )}
              <input
                type="file"
                id="profilePhoto"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'profilePhoto')}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#FF6F00] file:text-white hover:file:bg-[#E65100]"
              />
            </div>

            <div>
              <label htmlFor="village" className="block text-sm font-medium text-gray-700">Village</label>
              <input
                type="text"
                id="village"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FF6F00] focus:border-[#FF6F00]"
                required
              />
            </div>

            <div>
              <label htmlFor="panchayat" className="block text-sm font-medium text-gray-700">Panchayat</label>
              <input
                type="text"
                id="panchayat"
                value={panchayat}
                onChange={(e) => setPanchayat(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FF6F00] focus:border-[#FF6F00]"
                required
              />
            </div>

            <div>
              <label htmlFor="district" className="block text-sm font-medium text-gray-700">District</label>
              <input
                type="text"
                id="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FF6F00] focus:border-[#FF6F00]"
                required
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">State</label>
              <input
                type="text"
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FF6F00] focus:border-[#FF6F00]"
                required
              />
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700">Preferred Language</label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FF6F00] focus:border-[#FF6F00]"
              >
                <option value="en">English</option>
                <option value="ta">Tamil</option>
                <option value="hi">Hindi</option>
                <option value="ml">Malayalam</option>
                <option value="te">Telugu</option>
                <option value="kn">Kannada</option>
                <option value="or">Odia</option>
              </select>
            </div>

            <div>
              <label htmlFor="aadharFront" className="block text-sm font-medium text-gray-700">Aadhaar Card Front Image</label>
              {aadharFrontUrl && (
                <div className="mt-2 mb-2">
                  <img src={aadharFrontUrl} alt="Aadhaar Front Preview" className="w-32 h-32 object-cover rounded-md" />
                </div>
              )}
              <input
                type="file"
                id="aadharFront"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'aadharFront')}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#FFC107] file:text-black hover:file:bg-[#FFB300]"
                required={!aadharFrontUrl}
              />
            </div>

            <div>
              <label htmlFor="aadharBack" className="block text-sm font-medium text-gray-700">Aadhaar Card Back Image</label>
              {aadharBackUrl && (
                <div className="mt-2 mb-2">
                  <img src={aadharBackUrl} alt="Aadhaar Back Preview" className="w-32 h-32 object-cover rounded-md" />
                </div>
              )}
              <input
                type="file"
                id="aadharBack"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'aadharBack')}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#FFC107] file:text-black hover:file:bg-[#FFB300]"
                required={!aadharBackUrl}
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#FF6F00] text-white py-2 px-4 rounded-md hover:bg-[#E65100] focus:outline-none focus:ring-2 focus:ring-[#FFC107] disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : isEditing ? 'Update Profile' : 'Complete Profile'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={toggleEditMode}
                  className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        <button
          onClick={() => router.push('/')}
          className="w-full mt-4 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Home
        </button>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
}

export default CompleteProfilePage;