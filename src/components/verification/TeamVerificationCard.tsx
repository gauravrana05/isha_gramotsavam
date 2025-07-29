import React from 'react';
import { Users, MapPin, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TeamData {
  id: string;
  teamName: string;
  sport: string;
  captainName: string;
  captainPhone: string;
  panchayat: string;
  district: string;
  state: string;
  playersCount: number;
  maxPlayers: number;
  status: string;
  submittedAt: string;
  gender: string;
}

interface TeamVerificationCardProps {
  team: TeamData;
  onSelect: (teamId: string) => void;
}

export const TeamVerificationCard: React.FC<TeamVerificationCardProps> = ({
  team,
  onSelect
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'submitted':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'approved':
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'partial_verification':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'submitted':
        return 'yellow';
      case 'approved':
      case 'verified':
        return 'green';
      case 'rejected':
        return 'red';
      case 'partial_verification':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(team.id)}>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold font-fira text-gray-900">{team.teamName}</h3>
            <p className="text-sm text-gray-600 font-fira capitalize">{team.sport} • {team.gender === 'F' ? 'Women' : team.gender === 'M' ? 'Men' : 'Mixed'}</p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(team.status)}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              getStatusColor(team.status) === 'green' ? 'bg-green-100 text-green-800' :
              getStatusColor(team.status) === 'red' ? 'bg-red-100 text-red-800' :
              getStatusColor(team.status) === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
              getStatusColor(team.status) === 'orange' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {team.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            <span className="font-fira">
              Captain: {team.captainName} • {team.captainPhone}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="font-fira">
              {team.panchayat}, {team.district}, {team.state}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="font-fira text-gray-600">
              Players: {team.playersCount}/{team.maxPlayers}
            </span>
            <span className="font-fira text-gray-500">
              Submitted: {formatDate(team.submittedAt)}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(team.id);
            }}
            className="w-full bg-[#CE4520] hover:bg-[#1565C0] text-white py-2 px-4 rounded-lg transition-colors font-fira"
          >
            Review Team
          </button>
        </div>
      </div>
    </div>
  );
};