'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { AdvancedTable, type Column } from '@/components/ui';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { 
  Users, 
  UserPlus, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  Edit
} from 'lucide-react';

interface TeamPlayer {
  id: string;
  userId: string;
  position: 'main' | 'substitute';
  status: 'pending' | 'verified' | 'rejected';
  firstName: string;
  lastName: string;
  phone: string;
  whatsappNumber?: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    age: number;
    gender: 'M' | 'F' | 'O';
  };
}

export default function CaptainTeamPlayersPage() {
  const router = useRouter();
  const { lang, teamId } = useParams();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    whatsappNumber: '',
    age: '',
    gender: 'M' as 'M' | 'F' | 'O',
    position: 'main' as 'main' | 'substitute',
    panchayat: '',
    taluk: '',
    district: '',
    state: '',
  });

  const { data: players, isLoading, refetch } = api.teams.players.getTeamPlayers.useQuery({
    teamId: teamId as string,
  });

  const addPlayerMutation = api.teams.players.addPlayer.useMutation({
    onSuccess: () => {
      addNotification('Player added successfully', 'success');
      setIsModalOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    },
  });

  const updatePlayerMutation = api.teams.players.updatePlayer.useMutation({
    onSuccess: () => {
      addNotification('Player updated successfully', 'success');
      setIsModalOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    },
  });

  const removePlayerMutation = api.teams.players.removePlayer.useMutation({
    onSuccess: () => {
      addNotification('Player removed successfully', 'success');
      refetch();
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    },
  });

  const columns: Column<TeamPlayer>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (player) => (
        <div>
          <div className="font-medium text-gray-900">
            {player.user?.firstName || player.firstName} {player.user?.lastName || player.lastName}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Phone className="w-3 h-3" />
            {player.user?.phone || player.phone}
          </div>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (player) => (
        <div className="text-sm">
          <div>Age: {player.user?.age || player.age} • {(player.user?.gender || player.gender) === 'M' ? 'Male' : (player.user?.gender || player.gender) === 'F' ? 'Female' : 'Other'}</div>
          <div className="text-gray-500 capitalize">{player.position}</div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (player) => (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="w-3 h-3 text-gray-400" />
          <span>{player.district}, {player.state}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (player) => {
        const statusConfig = {
          pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50', label: 'Pending' },
          verified: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Verified' },
          rejected: { icon: AlertCircle, color: 'text-red-600 bg-red-50', label: 'Rejected' },
        };
        const config = statusConfig[player.status];
        const Icon = config.icon;
        
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'addedAt',
      header: 'Added',
      render: (player) => (
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Calendar className="w-3 h-3" />
          {new Date(player.createdAt).toLocaleDateString()}
        </div>
      ),
    },
  ];

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      whatsappNumber: '',
      age: '',
      gender: 'M',
      position: 'main',
      panchayat: '',
      taluk: '',
      district: '',
      state: '',
    });
    setSelectedPlayer(null);
  };

  const handleAddPlayer = () => {
    setSelectedPlayer(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleRowClick = (player: TeamPlayer) => {
    setSelectedPlayer(player);
    setFormData({
      firstName: player.user?.firstName || player.firstName || '',
      lastName: player.user?.lastName || player.lastName || '',
      phone: player.user?.phone || player.phone || '',
      whatsappNumber: player.whatsappNumber || '',
      age: (player.user?.age || player.age || 0).toString(),
      gender: player.user?.gender || player.gender || 'M',
      position: player.position || 'main',
      panchayat: player.panchayat || '',
      taluk: player.taluk || '',
      district: player.district || '',
      state: player.state || '',
    });
    setIsModalOpen(true);
  };

  const handleRemovePlayer = (players: TeamPlayer[]) => {
    if (players.length === 1) {
      removePlayerMutation.mutate({
        teamId: teamId as string,
        playerId: players[0].id,
      });
    }
  };

  const handleSubmit = () => {
    const playerData = {
      teamId: teamId as string,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      whatsappNumber: formData.whatsappNumber || undefined,
      age: parseInt(formData.age),
      gender: formData.gender,
      position: formData.position,
      panchayat: formData.panchayat,
      taluk: formData.taluk,
      district: formData.district,
      state: formData.state,
    };

    if (selectedPlayer) {
      updatePlayerMutation.mutate({
        playerId: selectedPlayer.id,
        ...playerData,
      });
    } else {
      addPlayerMutation.mutate(playerData);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F28C38]"></div></div>;
  }

  return (
    <div className="p-6">
      <AdvancedTable
        data={players || []}
        columns={columns}
        title="Team Players"
        subtitle="Manage your team players"
        onRowClick={handleRowClick}
        headerActions={
          <button
            onClick={handleAddPlayer}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#F28C38] hover:bg-[#E07B2A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F28C38] transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Player
          </button>
        }
        headerActionsSingle={(players) => (
          <button
            onClick={() => handleRemovePlayer(players)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Player
          </button>
        )}
        showPagination={false}
      />

      <EnhancedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedPlayer ? 'Edit Player' : 'Add Player'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={addPlayerMutation.isLoading || updatePlayerMutation.isLoading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-md hover:bg-[#E07B2A] disabled:opacity-50"
            >
              {selectedPlayer ? <Edit className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              {selectedPlayer ? 'Update' : 'Add'} Player
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (Optional)</label>
            <input
              type="tel"
              value={formData.whatsappNumber}
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'M' | 'F' | 'O' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <select
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value as 'main' | 'substitute' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
            >
              <option value="main">Main Player</option>
              <option value="substitute">Substitute</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taluk</label>
            <input
              type="text"
              value={formData.taluk}
              onChange={(e) => setFormData({ ...formData, taluk: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Panchayat</label>
            <input
              type="text"
              value={formData.panchayat}
              onChange={(e) => setFormData({ ...formData, panchayat: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F28C38]"
            />
          </div>
        </div>
      </EnhancedModal>
    </div>
  );
}
