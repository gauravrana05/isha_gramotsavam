'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
// import { db } from '@/lib/firebase/config';
// import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { AdvancedTable, type AdvancedTableConfig } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import type { FilterField } from '@/components/ui/FilterSidebar';
import { 
  Camera, 
  Video, 
  Eye, 
  Download, 
  Edit,
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  MapPin,
  User,
  Target,
  Trophy,
  Hash
} from 'lucide-react';
import { MediaFullPreview } from '@/components/media/MediaFullPreview';
import { MediaEditModal } from '@/components/media/MediaEditModal';
import { MediaItem, MediaFilter } from '@/lib/types/media';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface Venue {
  id: string;
  name: string;
}

interface Tournament {
  id: string;
  name: string;
}

interface Match {
  id: string;
  matchNumber?: number;
  fixtureName?: string;
  roundName?: string;
}

export default function AdminMediaPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const router = useRouter();
  const { lang } = useParams();
  
  // Media state management
  const [mediaState, setMediaState] = useState({
    mediaItems: [] as any[],
    loading: false,
    error: null as string | null
  });

  const loadMedia = async (filters?: any, limit?: number) => {
    setMediaState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // TODO: Implement actual media loading with tRPC
      setMediaState(prev => ({ ...prev, mediaItems: [], loading: false }));
    } catch (error) {
      setMediaState(prev => ({ ...prev, error: 'Failed to load media', loading: false }));
    }
  };

  const updateMediaItem = async (mediaId: string, updates: any) => {
    try {
      // TODO: Implement actual media update with tRPC
      return true;
    } catch (error) {
      return false;
    }
  };

  const deleteMediaItem = async (mediaId: string) => {
    try {
      // TODO: Implement actual media deletion with tRPC
      return true;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (userProfile?.role !== 'admin') {
      router.push(`/${lang}/player/dashboard`);
      return;
    }

    loadData();
  }, [user, userProfile, authLoading, lang, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with tRPC calls
      setVenues([]);
      setTournaments([]);
      setMatches([]);

      // Load media
      const filters: MediaFilter = {
        type: 'all'
      };
      await loadMedia(filters, 100);
      
    } catch (err: any) {
      // Error handling removed
      setError('Failed to load data. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Calculate simple statistics
  const stats = {
    totalImages: mediaState.mediaItems.filter(item => item.type === 'image').length,
    totalVideos: mediaState.mediaItems.filter(item => item.type === 'video').length
  };

  const handleMediaPreview = (mediaId: string) => {
    const mediaItem = mediaState.mediaItems.find(item => item.mediaId === mediaId);
    if (mediaItem) {
      setPreviewMedia(mediaItem);
    }
  };

  const handleEditMedia = (mediaId: string) => {
    const mediaItem = mediaState.mediaItems.find(item => item.mediaId === mediaId);
    if (mediaItem) {
      setEditingMedia(mediaItem);
    }
  };

  const handleSaveMedia = async (mediaId: string, updates: Partial<MediaItem>): Promise<boolean> => {
    const success = await updateMediaItem(mediaId, updates);
    if (success) {
      setSuccessMessage('Media updated successfully');
    }
    return success;
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this media? This action cannot be undone.')) {
      const success = await deleteMediaItem(mediaId);
      if (success) {
        setSuccessMessage('Media deleted permanently');
      } else {
        setErrorMessage('Failed to delete media');
      }
    }
  };

  const handleDownloadMedia = (mediaItem: MediaItem) => {
    const link = document.createElement('a');
    link.href = mediaItem.url;
    link.download = mediaItem.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getContextInfo = (item: MediaItem) => {
    let tournament = null;
    let match = null;
    let round = null;

    // Look up tournament/fixture by fixtureId
    if (item.fixtureId) {
      const fixture = tournaments.find(t => t.id === item.fixtureId);
      tournament = fixture?.name || null;
    }

    // Look up match by matchId
    if (item.matchId) {
      const matchData = matches.find(m => m.id === item.matchId);
      if (matchData) {
        match = `Match #${matchData.matchNumber || item.matchId}`;
        round = matchData.roundName || null;
        // If we didn't find tournament from fixture, try from match
        if (!tournament) {
          tournament = matchData.fixtureName || null;
        }
      }
    }

    return tournament || match || round ? { tournament, match, round } : null;
  };

  const getVenueName = (item: MediaItem) => {
    const venue = venues.find(v => v.id === item.venueId);
    return venue?.name || null;
  };

  // AdvancedTable configuration
  const columns: Column<MediaItem>[] = [
    {
      key: 'preview',
      header: 'Media',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div 
            className="cursor-pointer hover:opacity-75 transition-opacity"
            onClick={() => handleMediaPreview(item.mediaId)}
          >
            {item.type === 'image' ? (
              <Image 
                src={item.url || ''} 
                alt={item.title || 'Media item'}
                width={64}
                height={64}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              item.thumbnailUrl ? (
                <Image 
                  src={item.thumbnailUrl} 
                  alt={item.title || 'Video thumbnail'}
                  width={64}
                  height={64}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Video className="w-6 h-6 text-gray-400" />
                </div>
              )
            )}
            {/* Fallback placeholder (hidden by default) */}
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center" style={{display: 'none'}}>
              {item.type === 'image' ? (
                <Camera className="w-6 h-6 text-gray-400" />
              ) : (
                <Video className="w-6 h-6 text-gray-400" />
              )}
            </div>
          </div>
        );
      },
      width: '80px'
    },
    {
      key: 'title',
      header: 'Title',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="font-medium text-gray-900">
            {item.title}
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'description',
      header: 'Description',
      render: (value, item, index) => {
        if (!item || !item.description) return <span className="text-gray-400">-</span>;
        const truncated = item.description.length > 80 
          ? item.description.substring(0, 80) + '...' 
          : item.description;
        return (
          <div 
            className="text-sm text-gray-600 max-w-xs"
            title={item.description}
          >
            {truncated}
          </div>
        );
      },
      width: '200px'
    },
    {
      key: 'context',
      header: 'Context',
      render: (value, item, index) => {
        if (!item) return null;
        const context = getContextInfo(item);
        if (!context) return <span className="text-gray-400">-</span>;
        
        return (
          <div className="text-sm">
            {context.tournament && (
              <div className="flex items-center text-gray-900">
                <Trophy className="w-3 h-3 mr-1" />
                {context.tournament}
              </div>
            )}
            {context.match && (
              <div className="flex items-center text-gray-600 mt-1">
                <Hash className="w-3 h-3 mr-1" />
                {context.match}
              </div>
            )}
            {context.round && (
              <div className="flex items-center text-gray-600 mt-1">
                <Target className="w-3 h-3 mr-1" />
                {context.round}
              </div>
            )}
          </div>
        );
      },
      width: '150px'
    },
    {
      key: 'type',
      header: 'Type',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <Badge variant={item.type === 'image' ? 'default' : 'secondary'}>
            {item.type === 'image' ? 'Image' : 'Video'}
          </Badge>
        );
      },
      sortable: true,
      width: '80px'
    },
    {
      key: 'uploader',
      header: 'Uploader',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center text-sm text-gray-900">
            <User className="w-4 h-4 text-gray-400 mr-1" />
            {item.uploadedByName}
          </div>
        );
      },
      sortable: true,
      width: '120px'
    },
    {
      key: 'venue',
      header: 'Venue',
      render: (value, item, index) => {
        if (!item) return null;
        const venueName = getVenueName(item);
        if (!venueName) return <span className="text-gray-400">-</span>;
        return (
          <div className="flex items-center text-sm text-gray-900">
            <MapPin className="w-4 h-4 text-gray-400 mr-1" />
            {venueName}
          </div>
        );
      },
      sortable: true,
      width: '120px'
    },
    {
      key: 'uploadedAt',
      header: 'Upload Date',
      render: (value, item, index) => {
        if (!item || !item.uploadedAt) return null;
        const date = item.uploadedAt?.seconds 
          ? new Date(item.uploadedAt.seconds * 1000)
          : new Date(item.uploadedAt);
        return (
          <div className="text-sm text-gray-600">
            {date.toLocaleDateString()}
          </div>
        );
      },
      sortable: true,
      width: '100px'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMediaPreview(item.mediaId)}
              className="text-blue-600 hover:text-blue-800 p-1"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleEditMedia(item.mediaId)}
              className="text-green-600 hover:text-green-800 p-1"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDownloadMedia(item)}
              className="text-gray-600 hover:text-gray-800 p-1"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteMedia(item.mediaId)}
              className="text-red-600 hover:text-red-800 p-1"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
      width: '120px'
    }
  ];

  const filters: FilterField[] = [
    {
      key: 'type',
      label: 'Media Type',
      type: 'select',
      options: [
        { label: 'All Types', value: 'all' },
        { label: 'Images', value: 'image' },
        { label: 'Videos', value: 'video' }
      ]
    },
    {
      key: 'venueId',
      label: 'Venue',
      type: 'select',
      options: [
        { label: 'All Venues', value: 'all' },
        ...venues.map(venue => ({ label: venue.name, value: venue.id }))
      ]
    },
    {
      key: 'fixtureId',
      label: 'Tournament',
      type: 'select',
      options: [
        { label: 'All Tournaments', value: 'all' },
        ...tournaments.map(tournament => ({ label: tournament.name, value: tournament.id }))
      ]
    },
    {
      key: 'uploadedByName',
      label: 'Uploader',
      type: 'text',
      placeholder: 'Search by uploader name...'
    }
  ];

  if (authLoading || loading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadData}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Check if user is admin
  if (!user || !userProfile || userProfile.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Only administrators can access media management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Media Management</h1>
        <p className="text-gray-600">
          Browse and manage uploaded media from all venues
        </p>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {(errorMessage || mediaState.error) && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {errorMessage || mediaState.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Simple Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Images</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalImages}</p>
            </div>
            <Camera className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Videos</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalVideos}</p>
            </div>
            <Video className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* AdvancedTable */}
      <AdvancedTable
        data={mediaState.mediaItems}
        columns={columns}
        loading={mediaState.loading}
        
        searchable={true}
        searchPlaceholder="Search media titles, descriptions..."
        searchFields={['title', 'description', 'uploadedByName']}
        
        filterable={true}
        filters={filters}
        
        sortable={true}
        defaultSort={[{ key: 'uploadedAt', direction: 'desc' }]}
        
        pagination={{ enabled: true, pageSize: 20 }}
        
        persistState={true}
        stateKey="admin-media"
        
        emptyState={{
          icon: Camera,
          title: 'No media found',
          description: 'Media uploads will appear here once volunteers start uploading'
        }}
      />

      {/* Media Full Preview Modal */}
      <MediaFullPreview
        mediaItem={previewMedia}
        isOpen={!!previewMedia}
        onClose={() => setPreviewMedia(null)}
        onEdit={handleEditMedia}
        onDelete={handleDeleteMedia}
        onDownload={handleDownloadMedia}
        showActions={true}
      />

      {/* Edit Media Modal */}
      <MediaEditModal
        mediaItem={editingMedia}
        isOpen={!!editingMedia}
        onClose={() => setEditingMedia(null)}
        onSave={handleSaveMedia}
        isAdmin={true}
      />
    </div>
  );
}