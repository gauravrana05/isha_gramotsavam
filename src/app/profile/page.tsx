// src/app/profile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '../../../utils/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user && !initialDataLoaded) {
      // Fetch user data if not already loaded
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setName(userData.name || '');
            setVillage(userData.village || '');
            setDistrict(userData.district || '');
            setState(userData.state || '');
            setPincode(userData.pincode || '');
          }
          setInitialDataLoaded(true);
        } catch (err) {
          console.error("Error fetching user data:", err);
          setError("Failed to load profile data.");
          setInitialDataLoaded(true); // Still set to true to avoid infinite loop
        }
      };
      fetchUserData();
    }
  }, [user, loading, router, initialDataLoaded]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      let aadhaarDownloadURL = '';
      let profilePhotoDownloadURL = '';

      if (aadhaarFile) {
        const aadhaarRef = ref(storage, `aadhaar/${user.uid}/${aadhaarFile.name}`);
        await uploadBytes(aadhaarRef, aadhaarFile);
        aadhaarDownloadURL = await getDownloadURL(aadhaarRef);
      }

      if (profilePhoto) {
        const profilePhotoRef = ref(storage, `profilePhotos/${user.uid}/${profilePhoto.name}`);
        await uploadBytes(profilePhotoRef, profilePhoto);
        profilePhotoDownloadURL = await getDownloadURL(profilePhotoRef);
      }

      const userDocRef = doc(db, 'users', user.uid);
      const updateData: any = {
        name,
        village,
        district,
        state,
        pincode,
      };

      if (aadhaarDownloadURL) {
        updateData.aadhaarURL = aadhaarDownloadURL;
      }
      if (profilePhotoDownloadURL) {
        updateData.profilePhotoURL = profilePhotoDownloadURL;
      }

      await updateDoc(userDocRef, updateData);

      alert('Profile updated successfully!'); // Simple success feedback

    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || (user && !initialDataLoaded)) {
    return <div>Loading profile...</div>; // Loading state while fetching data
  }

  if (!user) {
    return null; // Redirecting to login in useEffect
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-start w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold mb-6">Edit Profile</h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="w-full max-w-lg">
          <div className="flex flex-wrap -mx-3 mb-6">
            <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
              <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="name">
                Full Name
              </label>
              <input
                className="appearance-none block w-full bg-gray-200 text-gray-700 border rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white"
                id="name"
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="w-full md:w-1/2 px-3">
              <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="village">
                Village
              </label>
              <input
                className="appearance-none block w-full bg-gray-200 text-gray-700 border rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white"
                id="village"
                type="text"
                placeholder="Village Name"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-wrap -mx-3 mb-6">
            <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
              <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="district">
                District
              </label>
              <input
                className="appearance-none block w-full bg-gray-200 text-gray-700 border rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white"
                id="district"
                type="text"
                placeholder="District Name"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
              />
            </div>
            <div className="w-full md:w-1/2 px-3">
              <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="state">
                State
              </label>
              <input
                className="appearance-none block w-full bg-gray-200 text-gray-700 border rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white"
                id="state"
                type="text"
                placeholder="State Name"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-wrap -mx-3 mb-6">
            <div className="w-full px-3">
              <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="pincode">
                Pincode
              </label>
              <input
                className="appearance-none block w-full bg-gray-200 text-gray-700 text-gray-700 border rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white"
                id="pincode"
                type="text"
                placeholder="123456"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-wrap -mx-3 mb-6">
            <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
              <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="aadhaarFile">
                Upload New Aadhaar File
              </label>
              <input
                className="appearance-none block w-full bg-gray-200 text-gray-700 border rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white"
                id="aadhaarFile"
                type="file"
                onChange={(e) => handleFileChange(e, setAadhaarFile)}
                accept=".pdf, .jpg, .jpeg, .png"
              />
               {aadhaarFile && <p className="text-gray-600 text-xs italic mt-1">{aadhaarFile.name}</p>}
            </div>
            <div className="w-full md:w-1/2 px-3">
              <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="profilePhoto">
                Upload New Profile Photo
              </label>
              <input
                className="appearance-none block w-full bg-gray-200 text-gray-700 border rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white"
                id="profilePhoto"
                type="file"
                onChange={(e) => handleFileChange(e, setProfilePhoto)}
                accept=".jpg, .jpeg, .png"
              />
              {profilePhoto && <p className="text-gray-600 text-xs italic mt-1">{profilePhoto.name}</p>}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default ProfilePage;
