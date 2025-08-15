"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  Users, 
  Eye, 
  Upload, 
  AlertTriangle, 
  XCircle, 
  Loader2
} from 'lucide-react';
import { 
  Button, 
  Modal, 
  StatusBadge,
  AdvancedTable,
  type Column,
  type ActionButton
} from '@/components/ui';
import Input from '@/components/ui/Input';
import { collectionManagers, firebaseUtils } from '../lib/firebaseOperations';
import { batchGenerators } from '../lib/dataGenerators';

interface UsersStats {
  total: number;
  byRole: Record<string, number>;
  verified: number;
  unverified: number;
  testDataCount: number;
}

export default function UsersManagementFixed() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<UsersStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Form states
  const [bulkCount, setBulkCount] = useState(10);
  const [createLoading, setCreateLoading] = useState(false);

  // Load users data
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const testUsers = await collectionManagers.users.readTestData();
      setUsers(testUsers);
      
      // Calculate stats
      const allStats = await collectionManagers.users.getStats();
      const testDataCount = testUsers.length;
      
      const byRole: Record<string, number> = {};
      let verified = 0;
      let unverified = 0;
      
      testUsers.forEach(user => {
        byRole[user.role] = (byRole[user.role] || 0) + 1;
        if (user.isVerified) verified++;
        else unverified++;
      });
      
      setStats({
        total: allStats.total,
        byRole,
        verified,
        unverified,
        testDataCount
      });
      
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Create bulk users for Isha Gramotsavam 2025
  const handleBulkCreate = async () => {
    try {
      setCreateLoading(true);
      
      const usersData = batchGenerators.generateUsers(bulkCount);
      await collectionManagers.users.createBatch(usersData);
      
      await firebaseUtils.createAuditLog(
        'bulk_create_test_users',
        'users',
        { count: bulkCount }
      );
      
      setShowBulkCreateModal(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create users');
    } finally {
      setCreateLoading(false);
    }
  };

  // Delete user
  const handleDelete = async (userId: string) => {
    try {
      await collectionManagers.users.delete(userId);
      
      await firebaseUtils.createAuditLog(
        'delete_test_user',
        'users',
        { userId }
      );
      
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  // Delete all test users
  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      
      const deletedCount = await collectionManagers.users.deleteAllTestData();
      
      await firebaseUtils.createAuditLog(
        'delete_all_test_users',
        'users',
        { deletedCount }
      );
      
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete all users');
    }
  };

  // Table configuration
  const columns: Column[] = [
    {
      key: 'name',
      header: 'Name',
      render: (user) => (
        <div>
          <div className="font-medium">{user.firstName} {user.lastName}</div>
          <div className="text-sm text-gray-500">{user.phoneNumber}</div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <StatusBadge status={user.role} />
      )
    },
    {
      key: 'location',
      header: 'Location',
      render: (user) => (
        <div className="text-sm">
          <div>{user.panchayat}</div>
          <div className="text-gray-500">{user.district}, {user.state}</div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <div className="space-y-1">
          <StatusBadge 
            status={user.isVerified ? 'success' : 'pending'} 
          />
          {user.isProfileComplete && (
            <StatusBadge status="completed" />
          )}
        </div>
      )
    },
    {
      key: 'created',
      header: 'Created',
      render: (user) => (
        <div className="text-sm text-gray-500">
          {user.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
        </div>
      )
    }
  ];

  const actions: ActionButton[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: (user) => setSelectedUser(user),
      variant: 'secondary'
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: (user) => {
        setSelectedUser(user);
        setShowDeleteConfirm(true);
      },
      variant: 'danger'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-gray-700" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Users Management</h2>
            <p className="text-sm text-gray-600">Create captains, players, and volunteers for Isha Gramotsavam 2025</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowBulkCreateModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Create Users
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.testDataCount}</div>
            <div className="text-sm text-gray-600">Test Users</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
            <div className="text-sm text-gray-600">Verified</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.unverified}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.byRole?.captain || 0}</div>
            <div className="text-sm text-gray-600">Captains</div>
          </div>
        </div>
      )}

      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">User Creation for Isha Gramotsavam 2025</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Creates realistic Indian users with proper location data</li>
          <li>• Random roles: players, captains, and volunteers</li>
          <li>• All users get Indian names, phone numbers, and addresses</li>
          <li>• Users can be used as team captains and players</li>
        </ul>
      </div>

      {/* Actions Bar */}
      {users.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            {users.length} test user(s) found
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAll}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All Test Data
          </Button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <AdvancedTable
          data={users}
          columns={columns}
          actions={actions}
          loading={loading}
        />
      </div>

      {/* Bulk Create Modal */}
      <Modal
        isOpen={showBulkCreateModal}
        onClose={() => setShowBulkCreateModal(false)}
        title="Bulk Create Users"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of users to create
            </label>
            <Input
              type="number"
              min="1"
              max="100"
              value={bulkCount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBulkCount(parseInt(e.target.value) || 10)}
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum 100 users per batch
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">What will be created:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• {bulkCount} users with Indian names and locations</li>
              <li>• Mixed roles: players, captains, and volunteers</li>
              <li>• Random verification status and profile completion</li>
              <li>• Realistic phone numbers and contact details</li>
            </ul>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowBulkCreateModal(false)}
              disabled={createLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCreate}
              loading={createLoading}
            >
              Create {bulkCount} Users
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedUser(null);
        }}
        title="Delete User"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-medium text-gray-900">Are you sure?</h3>
              <p className="text-sm text-gray-600">
                This will permanently delete the user account for{' '}
                <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => selectedUser && handleDelete(selectedUser.id)}
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>

      {/* User Details Modal */}
      {selectedUser && !showDeleteConfirm && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title="User Details"
        >
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-sm text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <p className="text-sm text-gray-900">{selectedUser.role}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="text-sm text-gray-900">{selectedUser.phoneNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <p className="text-sm text-gray-900">{selectedUser.gender}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="text-sm text-gray-900">
                  {selectedUser.village}, {selectedUser.panchayat}, {selectedUser.district}, {selectedUser.state}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}