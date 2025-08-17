"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Plus, Trash2, RefreshCw, Users, Upload, Eye, Download, FileSpreadsheet } from 'lucide-react';
import { Button, StatusBadge, AdvancedTable, Modal, type Column, type ActionButton } from '@/components/ui';
import Input from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { collectionManagers } from '../lib/firebaseOperations';
import { generators, batchGenerators, sampleData } from '../lib/dataGenerators';
import { 
  generateVenueExcelTemplate, 
  parseVenueExcelFile, 
  convertExcelRowToVenueData,
  type ExcelValidationError,
  type VenueExcelRow 
} from '@/lib/utils/excelUtils';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface VenueStats {
  total: number;
  byDistrict: Record<string, number>;
  byType: Record<string, number>;
  withVolunteers: number;
}

export default function VenuesManagementEnhanced() {
  const [venues, setVenues] = useState<any[]>([]);
  const [stats, setStats] = useState<VenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showVenueDetailModal, setShowVenueDetailModal] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);

  // Bulk creation form
  const [bulkCount, setBulkCount] = useState(5);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [venueType, setVenueType] = useState('cluster');
  const [includeVolunteers, setIncludeVolunteers] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);

  // Excel upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<ExcelValidationError[]>([]);
  const [parsedData, setParsedData] = useState<VenueExcelRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available districts for venue creation
  const districtOptions = [
    { value: '', label: 'Mixed Districts (Random)' },
    { value: 'Coimbatore', label: 'Coimbatore' },
    { value: 'Salem', label: 'Salem' },
    { value: 'Erode', label: 'Erode' },
    { value: 'Tirupur', label: 'Tirupur' },
    { value: 'Madurai', label: 'Madurai' },
    { value: 'Trichy', label: 'Trichy' },
    { value: 'Chennai', label: 'Chennai' },
    { value: 'Bangalore Rural', label: 'Bangalore Rural' },
    { value: 'Mysore', label: 'Mysore' },
    { value: 'Mandya', label: 'Mandya' },
    { value: 'Chittoor', label: 'Chittoor' },
    { value: 'Anantapur', label: 'Anantapur' },
    { value: 'Palakkad', label: 'Palakkad' },
    { value: 'Thrissur', label: 'Thrissur' }
  ];

  const typeOptions = [
    { value: 'cluster', label: 'Cluster Level' },
    { value: 'division', label: 'Division Level' },
    { value: 'final', label: 'Final Level' }
  ];

  const loadVenues = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const testVenues = await collectionManagers.venues.readTestData();
      setVenues(testVenues);

      // Calculate stats
      const byDistrict: Record<string, number> = {};
      const byType: Record<string, number> = {};
      let withVolunteers = 0;

      testVenues.forEach(venue => {
        // Add null safety checks for venue properties
        if (venue?.district) {
          byDistrict[venue.district] = (byDistrict[venue.district] || 0) + 1;
        }
        if (venue?.type) {
          byType[venue.type] = (byType[venue.type] || 0) + 1;
        }
        if (venue?.assignedVolunteers?.length > 0) {
          withVolunteers++;
        }
      });

      setStats({
        total: testVenues.length,
        byDistrict,
        byType,
        withVolunteers
      });

    } catch (err: any) {
      setError(err.message || 'Failed to load venues');
      console.error('Error loading venues:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const generateVenueWithVolunteers = (forceDistrict?: string, forceType?: string) => {
    let location;
    
    // If specific district is requested, filter locations
    if (forceDistrict && forceDistrict !== '') {
      // Find the location data for the requested district
      const states = Object.keys(sampleData?.locations || {});
      for (const state of states) {
        const stateData = (sampleData?.locations as any)?.[state];
        if (stateData?.districts?.includes(forceDistrict)) {
          location = {
            state,
            district: forceDistrict,
            panchayat: stateData.panchayats[Math.floor(Math.random() * stateData.panchayats.length)],
            village: stateData.villages[Math.floor(Math.random() * stateData.villages.length)],
            pincode: (Math.floor(Math.random() * 900000) + 100000).toString()
          };
          break;
        }
      }
    }
    
    // Fallback to random location if district not found
    if (!location) {
      location = generators.generateLocation();
    }

    const coordinates = generators.generateCoordinates();
    const type = forceType || venueType;
    
    // Generate volunteers if requested
    const volunteers = [];
    if (includeVolunteers) {
      const numVolunteers = Math.floor(Math.random() * 4) + 2; // 2-5 volunteers
      for (let i = 0; i < numVolunteers; i++) {
        const volunteerData = batchGenerators.generateUsers(1)[0];
        volunteerData.role = ['general_volunteer', 'technical_volunteer'][Math.floor(Math.random() * 2)];
        volunteers.push({
          userId: volunteerData.uid,
          name: `${volunteerData.firstName} ${volunteerData.lastName}`,
          role: volunteerData.role,
          phone: volunteerData.phoneNumber,
          assignedAt: new Date().toISOString()
        });
      }
    }

    const venueData = {
      name: `${location.panchayat} Sports Complex`,
      shortName: `${location.panchayat.substring(0, 8)} SC`,
      type,
      address: `Sports Complex Road, ${location.village}, ${location.panchayat}`,
      pincode: location.pincode,
      district: location.district,
      state: location.state,
      coordinates,
      supportedSports: [
        {
          sportId: 'volleyball',
          sportName: 'Volleyball',
          courtCount: Math.floor(Math.random() * 3) + 1,
          courtSpecifications: 'Standard volleyball court 18x9m with 2.43m net height'
        },
        {
          sportId: 'throwball',
          sportName: 'Throwball',
          courtCount: Math.floor(Math.random() * 2) + 1,
          courtSpecifications: 'Throwball court 12.2x18.3m with 2.2m net height'
        }
      ],
      primaryContact: {
        name: generators.generateName('M').firstName + ' ' + generators.generateName('M').lastName,
        phone: generators.generatePhoneNumber(),
        email: `venue.${location.panchayat.toLowerCase().replace(' ', '')}@ishagramotsavam.org`,
        role: 'Venue Coordinator'
      },
      assignedVolunteers: volunteers.map(v => v.userId),
      volunteerDetails: volunteers, // For display purposes
      officials: {
        coordinatorId: volunteers.length > 0 ? volunteers[0].userId : undefined,
        referees: [],
        medicalOfficer: volunteers.find(v => v.role === 'technical_volunteer')?.userId
      },
      isActive: true,
      currentStatus: 'available',
      totalMatchesHosted: 0,
      upcomingMatches: Math.floor(Math.random() * 10),
      utilizationRate: Math.floor(Math.random() * 100),
      eventId: 'isha_gramotsavam_2025',
      capacity: {
        seating: Math.floor(Math.random() * 500) + 200,
        parking: Math.floor(Math.random() * 100) + 50
      }
    };

    return venueData;
  };

  const handleBulkCreateVenues = async () => {
    try {
      setCreateLoading(true);

      const venuesData = [];
      for (let i = 0; i < bulkCount; i++) {
        const venueData = generateVenueWithVolunteers(selectedDistrict, venueType);
        venuesData.push(venueData);
      }

      await collectionManagers.venues.createBatch(venuesData);
      setShowBulkCreateModal(false);
      loadVenues();

    } catch (err: any) {
      setError(err.message || 'Failed to create venues');
      console.error('Error creating venues:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      await collectionManagers.venues.deleteAllTestData();
      loadVenues();
    } catch (err: any) {
      setError(err.message || 'Failed to delete venues');
    }
  };

  // Excel upload handlers
  const handleDownloadTemplate = () => {
    try {
      const templateBuffer = generateVenueExcelTemplate();
      const blob = new Blob([templateBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'venue_upload_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to generate template file');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    setUploadFile(file);
    setUploadErrors([]);
    setParsedData([]);

    try {
      setUploadLoading(true);
      const result = await parseVenueExcelFile(file);
      setParsedData(result.data);
      setUploadErrors(result.errors);
    } catch (err: any) {
      setError(err.message || 'Failed to parse Excel file');
    } finally {
      setUploadLoading(false);
    }
  };

  // Fetch sports data for Excel upload
  const getSportsData = async () => {
    try {
      const sportsSnapshot = await getDocs(
        query(collection(db, 'sports'), where('isActive', '==', true))
      );
      
      const sports = sportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const volleyballSport = sports.find((sport: any) => 
        sport.name?.toLowerCase() === 'volleyball' || sport.displayName?.toLowerCase() === 'volleyball'
      );
      
      const throwballSport = sports.find((sport: any) => 
        sport.name?.toLowerCase() === 'throwball' || sport.displayName?.toLowerCase() === 'throwball'
      );

      if (!volleyballSport || !throwballSport) {
        throw new Error('Required sports (Volleyball and Throwball) not found in sports collection');
      }

      return {
        volleyball: {
          sportId: volleyballSport.id,
          sportName: (volleyballSport as any).name || 'Volleyball',
          courtCount: '2',
          courtSpecifications: 'Standard volleyball court 18x9m with 2.43m net height'
        },
        throwball: {
          sportId: throwballSport.id,
          sportName: (throwballSport as any).displayName || (throwballSport as any).name || 'Throwball',
          courtCount: '1',
          courtSpecifications: 'Throwball court 12.2x18.3m with 2.2m net height'
        }
      };
    } catch (error) {
      console.error('Error fetching sports data:', error);
      throw error;
    }
  };

  const handleUploadVenues = async () => {
    if (parsedData.length === 0) {
      setError('No valid data to upload');
      return;
    }

    try {
      setUploadLoading(true);

      // Fetch sports data for real sport IDs
      const sportsData = await getSportsData();

      // Convert Excel data to venue format with real sports IDs
      const venuesData = parsedData.map(row => convertExcelRowToVenueData(row, sportsData));

      // Create venues in batch
      await collectionManagers.venues.createBatch(venuesData);
      
      setShowBulkUploadModal(false);
      setUploadFile(null);
      setParsedData([]);
      setUploadErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      loadVenues();
      setError('');

    } catch (err: any) {
      setError(err.message || 'Failed to upload venues');
      console.error('Error uploading venues:', err);
    } finally {
      setUploadLoading(false);
    }
  };

  const resetUploadModal = () => {
    setShowBulkUploadModal(false);
    setUploadFile(null);
    setParsedData([]);
    setUploadErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const columns: Column[] = [
    {
      key: 'name',
      header: 'Venue',
      render: (venue) => (
        <div>
          <div className="font-medium">{venue?.name || 'N/A'}</div>
          <div className="text-sm text-gray-500">{venue?.shortName || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'location',
      header: 'Location',
      render: (venue) => (
        <div className="text-sm">
          <div className="font-medium">{venue?.district || 'N/A'}</div>
          <div className="text-gray-500">{venue?.state || 'N/A'}</div>
          <div className="text-xs text-gray-400">{venue?.pincode || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Level',
      render: (venue) => (
        <StatusBadge status={venue?.type || 'unknown'} />
      )
    },
    {
      key: 'sports',
      header: 'Sports',
      render: (venue) => (
        <div className="text-sm">
          {venue?.supportedSports?.map((sport: any, idx: number) => (
            <div key={idx} className="mb-1">
              <span className="font-medium">{sport?.sportName || 'N/A'}</span>
              <span className="text-gray-500 ml-1">({sport?.courtCount || 0} courts)</span>
            </div>
          )) || <div className="text-gray-500">No sports data</div>}
        </div>
      )
    },
    {
      key: 'volunteers',
      header: 'Staff',
      render: (venue) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-gray-400" />
            <span>{venue?.assignedVolunteers?.length || 0} volunteers</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Contact: {venue?.primaryContact?.name || 'N/A'}
          </div>
        </div>
      )
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (venue) => (
        <div className="text-sm">
          <div>{venue?.capacity?.seating || 'N/A'} seats</div>
          <div className="text-gray-500">{venue?.capacity?.parking || 'N/A'} parking</div>
        </div>
      )
    }
  ];

  const actions: ActionButton[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (venue) => {
        setSelectedVenue(venue);
        setShowVenueDetailModal(true);
      },
      variant: 'secondary'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6 text-gray-700" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Venues Management</h2>
            <p className="text-sm text-gray-600">Create venues with proper district mapping and volunteer assignments</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadVenues} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBulkUploadModal(true)}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Button size="sm" onClick={() => setShowBulkCreateModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Create Venues
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Venues</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.withVolunteers}</div>
            <div className="text-sm text-gray-600">With Volunteers</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats.byType?.cluster || 0}</div>
            <div className="text-sm text-gray-600">Cluster Level</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{Object.keys(stats.byDistrict).length}</div>
            <div className="text-sm text-gray-600">Districts</div>
          </div>
        </div>
      )}

      {/* Information Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-800 mb-2">Venue Creation Features</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• Venues created with proper district and state mapping</li>
          <li>• Support for both Volleyball and Throwball sports</li>
          <li>• Automatic volunteer assignment (2-5 per venue)</li>
          <li>• Realistic capacity and contact information</li>
          <li>• GPS coordinates near Isha Yoga Center region</li>
        </ul>
      </div>

      {/* Actions Bar */}
      {venues.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            {venues.length} venue(s) found across {stats ? Object.keys(stats.byDistrict).length : 0} districts
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAll}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All Test Venues
          </Button>
        </div>
      )}

      {/* Venues Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <AdvancedTable
          data={venues}
          columns={columns}
          actions={actions}
          loading={loading}
        />
      </div>

      {/* Bulk Create Modal */}
      <Modal
        isOpen={showBulkCreateModal}
        onClose={() => setShowBulkCreateModal(false)}
        title="Bulk Create Venues with Volunteers"
      >
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of venues
              </label>
              <Input
                type="number"
                min="1"
                max="20"
                value={bulkCount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBulkCount(parseInt(e.target.value) || 5)}
              />
              <p className="text-sm text-gray-500 mt-1">Maximum 20 venues per batch</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                District Focus
              </label>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger>
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {districtOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tournament Level
              </label>
              <Select value={venueType} onValueChange={setVenueType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tournament level" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  checked={includeVolunteers}
                  onChange={(e) => setIncludeVolunteers(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Include volunteers</span>
              </label>
              <p className="text-sm text-gray-500 mt-1">Assign 2-5 volunteers per venue</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">What will be created:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• {bulkCount} venues in {selectedDistrict || 'mixed'} district(s)</li>
              <li>• Each venue supports Volleyball and Throwball</li>
              <li>• {includeVolunteers ? '2-5 volunteers assigned per venue' : 'No volunteers assigned'}</li>
              <li>• Realistic contact details and capacity</li>
              <li>• Set to &quot;{typeOptions.find(t => t.value === venueType)?.label}&quot; tournament level</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowBulkCreateModal(false)}
              disabled={createLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCreateVenues}
              loading={createLoading}
            >
              Create {bulkCount} Venues
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        isOpen={showBulkUploadModal}
        onClose={resetUploadModal}
        title="Bulk Upload Venues from Excel"
      >
        <div className="p-6 space-y-6">
          {/* Download Template Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Step 1: Download Template</h4>
            <p className="text-sm text-blue-700 mb-3">
              Download the Excel template, fill it with venue data, and upload it back.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload Section */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Step 2: Upload Filled Excel</h4>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              
              {uploadFile ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{uploadFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(uploadFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Click to select Excel file</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Upload Status */}
          {uploadLoading && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <RefreshCw className="w-4 h-4 text-gray-600 animate-spin mr-2" />
                <span className="text-sm text-gray-700">Processing Excel file...</span>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {uploadErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Validation Errors ({uploadErrors.length})</h4>
              <div className="max-h-40 overflow-y-auto">
                {uploadErrors.slice(0, 10).map((error, index) => (
                  <div key={index} className="text-sm text-red-700 mb-1">
                    Row {error.row}: {error.field} - {error.message}
                  </div>
                ))}
                {uploadErrors.length > 10 && (
                  <div className="text-sm text-red-600 font-medium">
                    ... and {uploadErrors.length - 10} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Valid Data Preview */}
          {parsedData.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">
                Ready to Upload ({parsedData.length} venues)
              </h4>
              <div className="max-h-32 overflow-y-auto">
                {parsedData.slice(0, 5).map((venue, index) => (
                  <div key={index} className="text-sm text-green-700 mb-1">
                    {venue.Name} - {venue.District}, {venue.State}
                  </div>
                ))}
                {parsedData.length > 5 && (
                  <div className="text-sm text-green-600 font-medium">
                    ... and {parsedData.length - 5} more venues
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={resetUploadModal}
              disabled={uploadLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadVenues}
              disabled={parsedData.length === 0 || uploadLoading}
              loading={uploadLoading}
            >
              Upload {parsedData.length} Venues
            </Button>
          </div>
        </div>
      </Modal>

      {/* Venue Detail Modal */}
      {selectedVenue && (
        <Modal
          isOpen={showVenueDetailModal}
          onClose={() => {
            setShowVenueDetailModal(false);
            setSelectedVenue(null);
          }}
          title={`Venue Details: ${selectedVenue?.name || 'Unknown Venue'}`}
        >
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <StatusBadge status={selectedVenue?.type || 'unknown'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <StatusBadge status={selectedVenue?.currentStatus || 'unknown'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="text-sm text-gray-900">
                  {selectedVenue?.district || 'N/A'}, {selectedVenue?.state || 'N/A'} - {selectedVenue?.pincode || 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Capacity</label>
                <p className="text-sm text-gray-900">
                  {selectedVenue?.capacity?.seating || 'N/A'} seats, {selectedVenue?.capacity?.parking || 'N/A'} parking
                </p>
              </div>
            </div>

            {/* Contact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Contact</label>
              <div className="bg-gray-50 rounded p-3">
                <p className="font-medium">{selectedVenue.primaryContact?.name}</p>
                <p className="text-sm text-gray-600">{selectedVenue.primaryContact?.role}</p>
                <p className="text-sm text-gray-600">{selectedVenue.primaryContact?.phone}</p>
                <p className="text-sm text-gray-600">{selectedVenue.primaryContact?.email}</p>
              </div>
            </div>

            {/* Assigned Volunteers */}
            {selectedVenue.volunteerDetails?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Volunteers ({selectedVenue.volunteerDetails.length})
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedVenue.volunteerDetails.map((volunteer: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{volunteer.name}</p>
                        <p className="text-xs text-gray-500">{volunteer.phone}</p>
                      </div>
                      <StatusBadge status={volunteer.role} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sports Facilities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sports Facilities</label>
              <div className="space-y-2">
                {selectedVenue.supportedSports?.map((sport: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded p-3">
                    <p className="font-medium">{sport.sportName}</p>
                    <p className="text-sm text-gray-600">{sport.courtCount} courts</p>
                    <p className="text-xs text-gray-500">{sport.courtSpecifications}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}