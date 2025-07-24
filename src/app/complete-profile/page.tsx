// src/app/complete-profile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '../../../utils/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'; // Import firestore functions
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Import storage functions

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

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // Fetch existing user data to pre-fill the form
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
          // We don't pre-fill file inputs for security reasons

          // If profile is already complete, redirect to home
          if (userData?.isProfileComplete) {
            console.log('Profile already complete, redirecting to home.');
            // TODO: Replace with your actual home/dashboard route
            // router.push('/dashboard');
          }
        }
      };
      fetchUserData();
    }
     if (!loading && !user) {
        // If not logged in, redirect to login
        router.push('/login');
     }


  }, [user, loading, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (fileType === 'aadharFront') {
        setAadharFront(file);
      } else if (fileType === 'aadharBack') {
        setAadharBack(file);
      } else if (fileType === 'profilePhoto') {
        setProfilePhoto(file);
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
      // Upload Aadhaar images to Cloud Storage
      const uploadTasks = [];
      const aadharImageUrls: { front?: string, back?: string } = {};
      const profilePhotoUrl: { url?: string } = {};

      if (aadharFront) {
        const aadharFrontRef = ref(storage, `aadhaar/${user.uid}/front_${aadharFront.name}`);
        const uploadTask = uploadBytes(aadharFrontRef, aadharFront).then(async (snapshot) => {
            // The Cloud Function will be triggered by this upload to update Firestore
            // For immediate feedback, you could get the download URL here, but relying on the CF is better for consistency
            console.log('Aadhaar front image uploaded.');
             // const downloadURL = await getDownloadURL(snapshot.ref); // If you need URL immediately
             // aadharImageUrls.front = downloadURL;
        });
        uploadTasks.push(uploadTask);
      }

      if (aadharBack) {
        const aadharBackRef = ref(storage, `aadhaar/${user.uid}/back_${aadharBack.name}`);
         const uploadTask = uploadBytes(aadharBackRef, aadharBack).then(async (snapshot) => {
             console.log('Aadhaar back image uploaded.');
            // const downloadURL = await getDownloadURL(snapshot.ref);
            // aadharImageUrls.back = downloadURL;
         });
        uploadTasks.push(uploadTask);
      }

       if (profilePhoto) {
        const profilePhotoRef = ref(storage, `profilePhotos/${user.uid}/${profilePhoto.name}`); // Define a path for profile photos
         const uploadTask = uploadBytes(profilePhotoRef, profilePhoto).then(async (snapshot) => {
             console.log('Profile photo uploaded.');
             const downloadURL = await getDownloadURL(snapshot.ref);
             profilePhotoUrl.url = downloadURL;
         });
        uploadTasks.push(uploadTask);
      }

      await Promise.all(uploadTasks);

      // Update user document in Firestore with text fields and profile photo URL
       const updateData: any = {
         name: name,
         village: village,
         panchayat: panchayat,
         district: district,
         state: state,
         language: language,
         updatedAt: new Date(), // Use client-side timestamp for immediate UI update
       };

        if(profilePhotoUrl.url) {
            updateData.profilePhotoUrl = profilePhotoUrl.url;
        }


       // Note: aadharFrontUrl and aadharBackUrl will be updated by the Cloud Function triggered by the storage upload
       // Set isProfileComplete to true here if you have other criteria, or rely on the Cloud Function to set it after Aadhaar uploads
       // For this plan, the Cloud Function for Aadhaar upload will set isProfileComplete
        updateData.isProfileComplete = true; // Assuming reaching this point means all required info + uploads are initiated


      await updateDoc(doc(db, 'users', user.uid), updateData);

      console.log('Profile updated successfully!');

      // Redirect to home/dashboard after profile completion
      // TODO: Replace with your actual home/dashboard route
      // router.push('/dashboard');

    } catch (err: any) {
      setError('Failed to complete profile: ' + err.message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
      // This case should be handled by the redirect in useEffect, but added as a fallback
      return <div className="flex items-center justify-center min-h-screen">Redirecting to login...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#FF6F00]">Complete Your Profile</h2>

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
            <input
              type="file"
              id="aadharFront"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'aadharFront')}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#FFC107] file:text-black hover:file:bg-[#FFB300]"
              required
            />
          </div>

          <div>
            <label htmlFor="aadharBack" className="block text-sm font-medium text-gray-700">Aadhaar Card Back Image</label>
            <input
              type="file"
              id="aadharBack"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'aadharBack')}
               className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#FFC107] file:text-black hover:file:bg-[#FFB300]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#FF6F00] text-white py-2 px-4 rounded-md hover:bg-[#E65100] focus:outline-none focus:ring-2 focus:ring-[#FFC107] disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Complete Profile'}
          </button>
        </form>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
}

export default CompleteProfilePage;
