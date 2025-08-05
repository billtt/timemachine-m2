import React, { useState, useEffect } from 'react';
import { AlertCircle, Key, Shield, CheckCircle } from 'lucide-react';
import { encryptionService } from '../services/encryption';
import apiService from '../services/api';
import Button from './Button';
import Input from './Input';
import toast from 'react-hot-toast';

export const EncryptionSettings: React.FC = () => {
  const [localPassword, setLocalPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  
  // Check encryption status on component mount and when actions complete
  useEffect(() => {
    const checkEncryptionStatus = () => {
      try {
        setIsEncrypted(encryptionService.isEncryptionEnabled());
      } catch (error) {
        console.error('Error checking encryption status:', error);
        setIsEncrypted(false);
      }
    };
    
    // Initial check with proper async handling
    encryptionService.initialize()
      .then(() => {
        checkEncryptionStatus();
        setIsInitialized(true);
      })
      .catch(error => {
        console.error('Failed to initialize encryption service:', error);
        setIsEncrypted(false);
        setIsInitialized(true); // Still mark as initialized to show the component
      });
  }, []);

  const handleSetPassword = async () => {
    try {
      await encryptionService.setPassword(localPassword);
      
      if (localPassword) {
        toast.success('Encryption password set locally. New slices will be encrypted.');
      } else {
        toast.success('Encryption password cleared locally.');
      }
      
      setLocalPassword('');
      
      // Update local state immediately
      setIsEncrypted(encryptionService.isEncryptionEnabled());
    } catch (error) {
      toast.error('Failed to set encryption password');
    }
  };

  const handleUpdatePasswordConfirm = () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (!newPassword && isEncrypted) {
      // Disabling encryption
      setShowUpdateConfirm(true);
    } else if (newPassword) {
      // Updating to new password
      setShowUpdateConfirm(true);
    } else {
      toast.error('Please enter a new password');
    }
  };

  const handleUpdatePassword = async () => {
    setShowUpdateConfirm(false);
    setIsUpdating(true);
    
    try {
      const oldKey = encryptionService.getStoredKey() || '';
      
      // Generate new key without storing it yet
      let newKey = '';
      if (newPassword) {
        newKey = await encryptionService.deriveKey(newPassword);
      }

      // Send key rotation request to server FIRST
      const response = await apiService.rotateEncryptionKey({
        oldKey,
        newKey
      });

      // Only update local password AFTER server operation succeeds
      await encryptionService.setPassword(newPassword);

      if (newPassword) {
        toast.success(`Encryption password updated. ${response.slicesUpdated} slices re-encrypted.`);
      } else {
        toast.success(`Encryption disabled. ${response.slicesUpdated} slices decrypted.`);
      }
      
      setNewPassword('');
      setConfirmPassword('');
      
      // Update local state immediately
      setIsEncrypted(encryptionService.isEncryptionEnabled());
      
      // Reload slices with new encryption
      window.location.reload();
    } catch (error) {
      // Server operation failed - local password remains unchanged
      toast.error('Failed to update encryption password. Local settings unchanged.');
      console.error('Update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };


  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Shield className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Content Encryption
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            Initializing encryption service...
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Shield className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Content Encryption
          </h2>
        </div>

        {/* Status Display */}
        <div className={`p-4 rounded-lg mb-6 ${
          isEncrypted 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-start space-x-3">
            {isEncrypted ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                isEncrypted 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                {isEncrypted ? 'Encryption is enabled' : 'Content is not encrypted'}
              </p>
              <p className={`text-sm mt-1 ${
                isEncrypted 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-yellow-700 dark:text-yellow-300'
              }`}>
                {isEncrypted 
                  ? 'Your slice content is encrypted locally before being sent to the server.'
                  : 'Your slice content is stored in plain text. Set a password to enable client-side encryption.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Set Password Section (Always visible) */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Set Local Encryption Password
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            This only changes your local encryption password. Existing slices remain unchanged.
          </p>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Enter encryption password (leave empty to disable locally)"
              value={localPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalPassword(e.target.value)}
            />
            <Button onClick={handleSetPassword}>
              <Key className="w-4 h-4 mr-2" />
              Set Password Locally
            </Button>
          </div>
        </div>

        {/* Update Password Section (Always visible) */}
        <div className="border-t dark:border-gray-700 pt-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Update Server Encryption
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            This will update ALL your slices and search tokens on the server with the new password.
          </p>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="New password (leave empty to disable encryption)"
              value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            />
            <Button
              onClick={handleUpdatePasswordConfirm}
              disabled={isUpdating || newPassword !== confirmPassword}
            >
              {newPassword ? 'Update Password' : 'Disable Encryption'}
            </Button>
          </div>
        </div>

        {/* Important Notes */}
        <div className="mt-6 space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
            <p>If you forget your password, your encrypted content cannot be recovered.</p>
          </div>
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
            <p>Use the same password on all devices to access your encrypted content.</p>
          </div>
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
            <p>The encryption key never leaves your device except during server updates.</p>
          </div>
        </div>
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
              {newPassword 
                ? `This will update ALL your slices on the server with the new encryption password. This action cannot be undone.`
                : `This will decrypt ALL your slices on the server and disable encryption. This action cannot be undone.`
              }
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={handleUpdatePassword}
                variant="primary"
              >
                {newPassword ? 'Update All Slices' : 'Disable Encryption'}
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

      {/* Updating Progress Modal */}
      {isUpdating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Updating Server Encryption
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we update all your slices on the server. This may take a few moments...
            </p>
          </div>
        </div>
      )}
    </>
  );
};