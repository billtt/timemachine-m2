import React, { useState, useEffect } from 'react';
import { AlertCircle, Key, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { encryptionService } from '../services/encryption';
import apiService from '../services/api';
import Button from './Button';
import Input from './Input';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

type OperationType = 'set-local' | 'update-server' | null;

export const EncryptionSettings: React.FC = () => {
  const [password, setPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [operationType, setOperationType] = useState<OperationType>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const queryClient = useQueryClient();
  
  // Validate encryption state and determine operation type
  useEffect(() => {
    const validateEncryptionState = async () => {
      setIsValidating(true);
      setValidationError(null);
      
      try {
        // Initialize encryption service first
        await encryptionService.initialize();
        
        // Validate local key state using the existing logic
        const validation = await encryptionService.validateLocalKey();
        
        if (validation.isValid) {
          // Local key matches server state - show update operation
          setOperationType('update-server');
        } else {
          // Local key doesn't match server state - show set local operation
          setOperationType('set-local');
        }
        
      } catch (error) {
        console.error('Failed to validate encryption state:', error);
        setValidationError('Failed to check encryption status. Please check your connection.');
        // Default to set-local operation on error
        setOperationType('set-local');
      } finally {
        setIsValidating(false);
      }
    };

    validateEncryptionState();
  }, []);

  const handleSetLocalPassword = async () => {
    setIsUpdating(true);
    
    try {
      await encryptionService.setPassword(password);
      
      if (password) {
        toast.success('Encryption password set locally. New slices will be encrypted.');
      } else {
        toast.success('Encryption password cleared locally.');
      }
      
      setPassword('');
      setConfirmPassword('');
      
      // Refetch all slice queries to update with new key
      await queryClient.refetchQueries({ queryKey: ['slices'] });
      await queryClient.refetchQueries({ queryKey: ['decrypted-slices'] });
      
      // Re-validate to update the UI
      const validation = await encryptionService.validateLocalKey();
      if (validation.isValid) {
        setOperationType('update-server');
      }
      
    } catch (error) {
      toast.error('Failed to set encryption password');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateServerPassword = async () => {
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    // If encryption is currently enabled, verify old password first
    if (encryptionService.isEncryptionEnabled()) {
      if (!oldPassword) {
        toast.error('Please enter your current password');
        return;
      }
      
      // Verify old password locally by comparing derived keys
      try {
        const currentKey = encryptionService.getStoredKey();
        const derivedKey = await encryptionService.deriveKey(oldPassword);
        
        if (currentKey !== derivedKey) {
          toast.error('Current password is incorrect');
          return;
        }
      } catch (error) {
        toast.error('Failed to verify current password');
        return;
      }
    }
    
    if (!password && encryptionService.isEncryptionEnabled()) {
      // Disabling encryption
      setShowUpdateConfirm(true);
    } else if (password) {
      // Updating to new password
      setShowUpdateConfirm(true);
    } else {
      toast.error('Please enter a password');
    }
  };

  const handleConfirmedUpdate = async () => {
    setShowUpdateConfirm(false);
    setIsUpdating(true);
    
    try {
      const oldKey = encryptionService.getStoredKey() || '';
      
      // Generate new key without storing it yet
      let newKey = '';
      if (password) {
        newKey = await encryptionService.deriveKey(password);
      }

      // Send key rotation request to server FIRST
      const response = await apiService.rotateEncryptionKey({
        oldKey,
        newKey
      });

      // Only update local password AFTER server operation succeeds
      await encryptionService.setPassword(password);

      if (password) {
        toast.success(`Encryption password updated. ${response.slicesUpdated} slices re-encrypted.`);
      } else {
        toast.success(`Encryption disabled. ${response.slicesUpdated} slices decrypted.`);
      }
      
      setPassword('');
      setOldPassword('');
      setConfirmPassword('');
      
      // Refetch all slice queries to update with new encryption
      await queryClient.refetchQueries({ queryKey: ['slices'] });
      await queryClient.refetchQueries({ queryKey: ['decrypted-slices'] });
      
      // Re-validate to update the UI
      const validation = await encryptionService.validateLocalKey();
      if (validation.isValid) {
        setOperationType('update-server');
      } else {
        setOperationType('set-local');
      }
      
    } catch (error) {
      // Server operation failed - local password remains unchanged
      toast.error('Failed to update encryption password. Local settings unchanged.');
      console.error('Update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };


  const getStatusInfo = () => {
    const hasLocalKey = encryptionService.isEncryptionEnabled();
    
    if (operationType === 'set-local') {
      return {
        icon: AlertCircle,
        color: 'yellow',
        title: 'Password Setup Required',
        description: hasLocalKey 
          ? 'Local password does not match server content. Set the correct password to access encrypted content.'
          : 'Set an encryption password to protect your content.'
      };
    } else if (operationType === 'update-server') {
      if (hasLocalKey) {
        return {
          icon: CheckCircle,
          color: 'green',
          title: 'Encryption Active',
          description: 'Your content is encrypted. You can update the password for all your content.'
        };
      } else {
        return {
          icon: AlertCircle,
          color: 'yellow',
          title: 'Content Unencrypted',
          description: 'Your content is not encrypted. You can enable encryption for all your content.'
        };
      }
    }
    
    return {
      icon: AlertCircle,
      color: 'gray',
      title: 'Unknown Status',
      description: 'Unable to determine encryption status.'
    };
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Shield className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Content Encryption
          </h2>
        </div>

        {/* Validation Loading State */}
        {isValidating && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600 mr-2" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Checking encryption status...
            </span>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <div className="p-4 rounded-lg mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Validation Failed
                </p>
                <p className="text-sm mt-1 text-red-700 dark:text-red-300">
                  {validationError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Display and Operation Form */}
        {!isValidating && operationType && (
          <>
            {/* Status Display */}
            <div className={`p-4 rounded-lg mb-6 ${
              getStatusInfo().color === 'green'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : getStatusInfo().color === 'yellow'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                : 'bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800'
            }`}>
              <div className="flex items-start space-x-3">
                {React.createElement(getStatusInfo().icon, {
                  className: `w-5 h-5 flex-shrink-0 mt-0.5 ${
                    getStatusInfo().color === 'green'
                      ? 'text-green-600 dark:text-green-400'
                      : getStatusInfo().color === 'yellow'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`
                })}
                <div>
                  <p className={`text-sm font-medium ${
                    getStatusInfo().color === 'green'
                      ? 'text-green-800 dark:text-green-200'
                      : getStatusInfo().color === 'yellow'
                      ? 'text-yellow-800 dark:text-yellow-200'
                      : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    {getStatusInfo().title}
                  </p>
                  <p className={`text-sm mt-1 ${
                    getStatusInfo().color === 'green'
                      ? 'text-green-700 dark:text-green-300'
                      : getStatusInfo().color === 'yellow'
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {getStatusInfo().description}
                  </p>
                </div>
              </div>
            </div>

            {/* Operation Form */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {operationType === 'set-local' ? 'Set Local Password' : 'Update Password'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {operationType === 'set-local'
                    ? 'Set your local encryption password to match the server content or start encrypting new content.'
                    : 'Change the encryption password for all your existing slices. This will re-encrypt all content with the new password.'}
                </p>
              </div>

              <div className="space-y-3">
                {/* Show old password field for update operation when encryption is enabled */}
                {operationType === 'update-server' && encryptionService.isEncryptionEnabled() && (
                  <Input
                    type="password"
                    placeholder="Current password"
                    value={oldPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOldPassword(e.target.value)}
                  />
                )}
                
                <Input
                  type="password"
                  placeholder={operationType === 'set-local' ? 'Enter encryption password' : 'New password (leave empty to disable)'}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                />
                
                {operationType === 'update-server' && (
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  />
                )}

                <Button
                  onClick={operationType === 'set-local' ? handleSetLocalPassword : handleUpdateServerPassword}
                  disabled={isUpdating || (operationType === 'update-server' && password !== confirmPassword)}
                  isLoading={isUpdating}
                >
                  <Key className="w-4 h-4 mr-2" />
                  {operationType === 'set-local' 
                    ? 'Set Password' 
                    : (password ? 'Update All Content' : 'Disable Encryption')}
                </Button>
              </div>
            </div>

            {/* Important Notes */}
            <div className="mt-6 pt-6 border-t dark:border-gray-700 space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                <p>If you forget your password, your encrypted content cannot be recovered.</p>
              </div>
              <div className="flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                <p>Use the same password on all devices to access your encrypted content.</p>
              </div>
              {operationType === 'update-server' && (
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <p>Server updates will re-encrypt ALL your content and cannot be undone.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirm Server Update
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {password 
                ? `This will update ALL your slices on the server with the new encryption password. This action cannot be undone.`
                : `This will decrypt ALL your slices on the server and disable encryption. This action cannot be undone.`
              }
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={handleConfirmedUpdate}
                variant="primary"
              >
                {password ? 'Update All Slices' : 'Disable Encryption'}
              </Button>
              <Button
                onClick={() => setShowUpdateConfirm(false)}
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};