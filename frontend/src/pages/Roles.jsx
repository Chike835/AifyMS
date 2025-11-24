import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  Users,
  Lock,
  AlertTriangle
} from 'lucide-react';

// Format permission slug for display
const formatPermissionName = (slug) => {
  return slug
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Format group name for display
const formatGroupName = (group) => {
  return group
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const Roles = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  // Form states
  const [roleFormData, setRoleFormData] = useState({ name: '', description: '' });
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [formError, setFormError] = useState('');

  // Fetch roles
  const {
    data: rolesData,
    isLoading: rolesLoading,
    error: rolesError
  } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get('/roles');
      return response.data;
    }
  });

  // Fetch all permissions
  const { data: permissionsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await api.get('/roles/permissions');
      return response.data;
    }
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/roles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      closeRoleModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to create role');
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/roles/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      closeRoleModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to update role');
    }
  });

  // Update role permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ id, permission_ids }) => {
      const response = await api.put(`/roles/${id}/permissions`, { permission_ids });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      closePermissionModal();
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || 'Failed to update permissions');
    }
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/roles/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to delete role');
    }
  });

  // Modal handlers
  const openCreateRoleModal = () => {
    setSelectedRole(null);
    setRoleFormData({ name: '', description: '' });
    setFormError('');
    setShowRoleModal(true);
  };

  const openEditRoleModal = (role) => {
    setSelectedRole(role);
    setRoleFormData({
      name: role.name,
      description: role.description || ''
    });
    setFormError('');
    setShowRoleModal(true);
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setSelectedRole(null);
    setRoleFormData({ name: '', description: '' });
    setFormError('');
  };

  const openPermissionModal = (role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions?.map((p) => p.id) || []);
    setFormError('');
    setShowPermissionModal(true);
  };

  const closePermissionModal = () => {
    setShowPermissionModal(false);
    setSelectedRole(null);
    setSelectedPermissions([]);
    setFormError('');
  };

  // Form handlers
  const handleRoleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!roleFormData.name.trim()) {
      setFormError('Role name is required');
      return;
    }

    if (selectedRole) {
      updateRoleMutation.mutate({ id: selectedRole.id, data: roleFormData });
    } else {
      createRoleMutation.mutate(roleFormData);
    }
  };

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handlePermissionsSubmit = () => {
    if (!selectedRole) return;
    updatePermissionsMutation.mutate({
      id: selectedRole.id,
      permission_ids: selectedPermissions
    });
  };

  const handleDeleteRole = (role) => {
    if (role.name === 'Super Admin') {
      alert('Cannot delete the Super Admin role');
      return;
    }

    if (role.user_count > 0) {
      alert(`Cannot delete role with ${role.user_count} assigned user(s). Reassign users first.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete the "${role.name}" role?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  // Select/Deselect all permissions in a group
  const handleGroupToggle = (groupPermissions) => {
    const groupIds = groupPermissions.map((p) => p.id);
    const allSelected = groupIds.every((id) => selectedPermissions.includes(id));

    if (allSelected) {
      // Deselect all in group
      setSelectedPermissions((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      // Select all in group
      setSelectedPermissions((prev) => [...new Set([...prev, ...groupIds])]);
    }
  };

  // Grouped permissions for the matrix view
  const groupedPermissions = useMemo(() => {
    return permissionsData?.grouped || {};
  }, [permissionsData]);

  const isProtectedRole = (roleName) => roleName === 'Super Admin';

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (rolesError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {rolesError.response?.data?.error || rolesError.message || 'Failed to load roles'}
      </div>
    );
  }

  const roles = rolesData || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-600 mt-2">
            Manage user roles and their associated permissions
          </p>
        </div>
        {hasPermission('role_manage') && (
          <button
            onClick={openCreateRoleModal}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Create Role</span>
          </button>
        )}
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
          >
            {/* Role Header */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Shield className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      {role.name}
                      {isProtectedRole(role.name) && (
                        <Lock className="h-4 w-4 ml-2 text-amber-500" title="Protected role" />
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {role.description || 'No description'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Stats */}
            <div className="p-4 bg-gray-50 grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <Users className="h-4 w-4" />
                  <span className="text-2xl font-bold">{role.user_count || 0}</span>
                </div>
                <p className="text-xs text-gray-500">Users</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <Shield className="h-4 w-4" />
                  <span className="text-2xl font-bold">{role.permissions?.length || 0}</span>
                </div>
                <p className="text-xs text-gray-500">Permissions</p>
              </div>
            </div>

            {/* Role Actions */}
            {hasPermission('role_manage') && (
              <div className="p-4 border-t border-gray-100 flex space-x-2">
                <button
                  onClick={() => openPermissionModal(role)}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  <span>Permissions</span>
                </button>
                <button
                  onClick={() => openEditRoleModal(role)}
                  className="flex items-center justify-center px-3 py-2 text-sm bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                  title="Edit role"
                >
                  <Edit className="h-4 w-4" />
                </button>
                {!isProtectedRole(role.name) && (
                  <button
                    onClick={() => handleDeleteRole(role)}
                    className="flex items-center justify-center px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                    title="Delete role"
                    disabled={deleteRoleMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {roles.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No roles found</p>
          </div>
        )}
      </div>

      {/* Create/Edit Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedRole ? 'Edit Role' : 'Create Role'}
              </h2>
              <button onClick={closeRoleModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {formError}
              </div>
            )}

            {selectedRole && isProtectedRole(selectedRole.name) && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-center">
                <Lock className="h-4 w-4 mr-2" />
                This is a protected role. Name cannot be changed.
              </div>
            )}

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  value={roleFormData.name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Sales Manager"
                  disabled={selectedRole && isProtectedRole(selectedRole.name)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={roleFormData.description}
                  onChange={(e) =>
                    setRoleFormData({ ...roleFormData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe the role's responsibilities"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={closeRoleModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createRoleMutation.isPending || updateRoleMutation.isPending
                    ? 'Saving...'
                    : selectedRole
                    ? 'Update'
                    : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Matrix Modal */}
      {showPermissionModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Manage Permissions
                </h2>
                <p className="text-gray-600 mt-1">
                  Role: <span className="font-semibold">{selectedRole.name}</span>
                </p>
              </div>
              <button
                onClick={closePermissionModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Error message */}
            {formError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {formError}
              </div>
            )}

            {/* Permission Groups */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([groupName, permissions]) => {
                  const groupIds = permissions.map((p) => p.id);
                  const selectedCount = groupIds.filter((id) =>
                    selectedPermissions.includes(id)
                  ).length;
                  const allSelected = selectedCount === permissions.length;
                  const someSelected = selectedCount > 0 && selectedCount < permissions.length;

                  return (
                    <div
                      key={groupName}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      {/* Group Header */}
                      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => handleGroupToggle(permissions)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              allSelected
                                ? 'bg-primary-600 border-primary-600'
                                : someSelected
                                ? 'bg-primary-200 border-primary-400'
                                : 'border-gray-300 hover:border-primary-400'
                            }`}
                          >
                            {(allSelected || someSelected) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </button>
                          <h3 className="font-semibold text-gray-900">
                            {formatGroupName(groupName)}
                          </h3>
                        </div>
                        <span className="text-sm text-gray-500">
                          {selectedCount} / {permissions.length}
                        </span>
                      </div>

                      {/* Permissions Grid */}
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {permissions.map((permission) => {
                          const isSelected = selectedPermissions.includes(permission.id);
                          return (
                            <label
                              key={permission.id}
                              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-primary-50 border-primary-300'
                                  : 'bg-white border-gray-200 hover:border-primary-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handlePermissionToggle(permission.id)}
                                className="sr-only"
                              />
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-primary-600 border-primary-600'
                                    : 'border-gray-300'
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <span
                                className={`text-sm ${
                                  isSelected ? 'text-primary-900 font-medium' : 'text-gray-700'
                                }`}
                              >
                                {formatPermissionName(permission.slug)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">{selectedPermissions.length}</span> permissions
                selected
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={closePermissionModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePermissionsSubmit}
                  disabled={updatePermissionsMutation.isPending}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {updatePermissionsMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save Permissions</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;

