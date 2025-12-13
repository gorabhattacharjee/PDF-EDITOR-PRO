import { create } from 'zustand';

interface Job {
  id: string;
  type: 'merge' | 'convert' | 'ocr' | 'compress' | 'split';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message?: string;
  createdAt: number;
}

interface JobsState {
  jobs: Job[];
  addJob: (job: Omit<Job, 'id' | 'createdAt'>) => string;
  updateJob: (id: string, updates: Partial<Job>) => void;
  removeJob: (id: string) => void;
  clearCompletedJobs: () => void;
}

export const useJobs = create<JobsState>((set) => ({
  jobs: [],

  addJob: (job) => {
    const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newJob: Job = {
      ...job,
      id,
      createdAt: Date.now(),
    };

    set((state) => ({
      jobs: [...state.jobs, newJob],
    }));

    return id;
  },

  updateJob: (id, updates) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, ...updates } : job
      ),
    }));
  },

  removeJob: (id) => {
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
    }));
  },

  clearCompletedJobs: () => {
    set((state) => ({
      jobs: state.jobs.filter((job) => job.status !== 'completed'),
    }));
  },
}));
