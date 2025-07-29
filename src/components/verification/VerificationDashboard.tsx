import React from 'react';
import { Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';

interface VerificationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  partialVerification: number;
}

interface VerificationDashboardProps {
  stats: VerificationStats;
  onFilterChange: (filter: string) => void;
  currentFilter: string;
}

export const VerificationDashboard: React.FC<VerificationDashboardProps> = ({
  stats,
  onFilterChange,
  currentFilter
}) => {
  const filters = [
    { key: 'all', label: 'All Teams', count: stats.total, icon: Users },
    { key: 'pending', label: 'Pending', count: stats.pending, icon: Clock, color: 'text-yellow-600' },
    { key: 'approved', label: 'Approved', count: stats.approved, icon: CheckCircle, color: 'text-green-600' },
    { key: 'rejected', label: 'Rejected', count: stats.rejected, icon: XCircle, color: 'text-red-600' },
    { key: 'partial', label: 'Partial', count: stats.partialVerification, icon: AlertCircle, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {filters.map(({ key, label, count, icon: Icon, color }) => (
          <StatCard
            key={key}
            title={label}
            value={count}
            icon={<Icon className={`w-5 h-5 ${color || 'text-blue-600'}`} />}
            onClick={() => onFilterChange(key)}
            className={`cursor-pointer transition-colors ${
              currentFilter === key ? 'ring-2 ring-[#CE4520]' : 'hover:shadow-md'
            }`}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold font-fira mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => onFilterChange('pending')}
              className="flex items-center justify-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <Clock className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="font-fira text-yellow-800">Review Pending Teams</span>
            </button>
            
            <button
              onClick={() => onFilterChange('partial')}
              className="flex items-center justify-center p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
              <span className="font-fira text-orange-800">Handle Partial Verification</span>
            </button>
            
            <button
              onClick={() => onFilterChange('approved')}
              className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-fira text-green-800">View Approved Teams</span>
            </button>
          </div>
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold font-fira mb-4">Verification Guidelines</h3>
          <div className="space-y-3 text-sm text-gray-600 font-fira">
            <p>• <strong>Same Panchayat:</strong> Verify all players are from the same panchayat as declared</p>
            <p>• <strong>Age Verification:</strong> Check age requirements (14-60 years)</p>
            <p>• <strong>Gender Verification:</strong> For throwball, ensure all players are women</p>
            <p>• <strong>Document Review:</strong> Check uploaded documents for authenticity</p>
            <p>• <strong>Contact Verification:</strong> Verify phone numbers and contact details</p>
          </div>
      </div>
    </div>
  );
};