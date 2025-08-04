import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { LoginFormData, RegisterFormData } from '../types';
import Button from '../components/Button';
import Input from '../components/Input';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, isLoading, error } = useAuthStore();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<LoginFormData & RegisterFormData>();


  const handleFormSubmit = async (data: LoginFormData & RegisterFormData) => {
    try {
      if (isLogin) {
        await login({ username: data.username, password: data.password });
      } else {
        await register({
          username: data.username,
          password: data.password,
          ...(data.email && { email: data.email })
        });
      }
    } catch (error) {
      // Error is handled in the store
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Clock className="w-12 h-12 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            TimeMachine
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your life, one slice at a time
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-center mt-2">
              {isLogin ? 'Sign in to your account' : 'Sign up to get started'}
            </p>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Username */}
            <Input
              label="Username"
              type="text"
              autoComplete="username"
              {...registerField('username', {
                required: 'Username is required',
                minLength: { value: 2, message: 'Username must be at least 2 characters' },
                maxLength: { value: 50, message: 'Username must be less than 50 characters' }
              })}
              error={errors.username?.message}
            />

            {/* Email (Register only) */}
            {!isLogin && (
              <Input
                label="Email (optional)"
                type="email"
                autoComplete="email"
                {...registerField('email', {
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Please enter a valid email'
                  }
                })}
                error={errors.email?.message}
              />
            )}

            {/* Password */}
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                {...registerField('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' }
                })}
                error={errors.password?.message}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          {/* Toggle mode */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={toggleMode}
                className="ml-1 text-primary-600 hover:text-primary-500 font-medium"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* PWA notice */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Install this app on your device for the best experience
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;