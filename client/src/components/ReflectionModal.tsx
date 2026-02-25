import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Modal from './Modal';
import Button from './Button';
import { ReflectionQuestion, ReflectionStatus } from '../types';
import { encryptionService } from '../services/encryption';
import apiService from '../services/api';
import { DEFAULT_REFLECTION_QUESTIONS } from '../config/reflectionQuestions';

interface ReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  onSaved: () => void;
}

export function getReflectionStatus(questions: ReflectionQuestion[]): ReflectionStatus {
  if (questions.length === 0) return 'empty';
  const nonEmpty = questions.filter(q => q.answer.trim() !== '');
  if (nonEmpty.length === 0) return 'empty';
  if (nonEmpty.length === questions.length) return 'full';
  return 'partial';
}

export const REFLECTION_EMOJI: Record<ReflectionStatus, string> = {
  empty: '😊',
  partial: '😄',
  full: '🥰'
};

const ReflectionModal: React.FC<ReflectionModalProps> = ({ isOpen, onClose, date, onSaved }) => {
  const [questions, setQuestions] = useState<ReflectionQuestion[]>([]);
  const [originalQuestions, setOriginalQuestions] = useState<ReflectionQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const dateStr = format(date, 'yyyy-MM-dd');

  useEffect(() => {
    if (!isOpen) return;
    loadReflection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dateStr]);

  const loadReflection = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getReflection(dateStr);
      if (data.reflection) {
        // Decrypt answers (mirrors how slices are decrypted for display)
        const decrypted = await Promise.all(
          data.reflection.questions.map(async (q) => ({
            ...q,
            answer: await encryptionService.getDisplayText(q.answer)
          }))
        );
        setQuestions(decrypted);
        setOriginalQuestions(decrypted);
      } else {
        // No record for this date: use current global config as template
        const template: ReflectionQuestion[] = DEFAULT_REFLECTION_QUESTIONS.map(q => ({
          ...q,
          answer: ''
        }));
        setQuestions(template);
        setOriginalQuestions(template);
      }
    } catch {
      toast.error('Failed to load reflection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, answer: value } : q));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Encrypt each answer (mirrors how slice content is encrypted before sending)
      const encrypted = await Promise.all(
        questions.map(async (q) => ({
          ...q,
          answer: await encryptionService.encrypt(q.answer)
        }))
      );
      await apiService.upsertReflection({ date: dateStr, questions: encrypted });
      setOriginalQuestions(questions);
      toast.success('Reflection saved');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to save reflection');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setQuestions(originalQuestions);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={`Daily Reflection — ${format(date, 'MMM d, yyyy')}`}
    >
      {isLoading ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {q.text}
              </label>
              <textarea
                value={q.answer}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                placeholder="Your answer..."
              />
            </div>
          ))}
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="secondary" size="sm" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={isSaving}>
              Save
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ReflectionModal;
