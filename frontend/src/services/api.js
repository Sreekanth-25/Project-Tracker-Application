import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Projects
export const getProjects = () => axios.get(`${API_URL}/projects`);
export const getProject = (id) => axios.get(`${API_URL}/projects/${id}`);
export const createProject = (data) => axios.post(`${API_URL}/projects`, data);
export const updateProject = (id, data) => axios.put(`${API_URL}/projects/${id}`, data);
export const deleteProject = (id) => axios.delete(`${API_URL}/projects/${id}`);

// Tasks
export const createTask = (projectId, data) => axios.post(`${API_URL}/projects/${projectId}/tasks`, data);
export const updateTask = (projectId, taskId, data) => axios.put(`${API_URL}/projects/${projectId}/tasks/${taskId}`, data);
export const deleteTask = (projectId, taskId) => axios.delete(`${API_URL}/projects/${projectId}/tasks/${taskId}`);

// Time Tracking
export const addTimeEntry = (projectId, taskId, data) => axios.post(`${API_URL}/projects/${projectId}/tasks/${taskId}/time`, data);
export const deleteTimeEntry = (projectId, taskId, timeId) => axios.delete(`${API_URL}/projects/${projectId}/tasks/${taskId}/time/${timeId}`);

// Milestones
export const createMilestone = (projectId, data) => axios.post(`${API_URL}/projects/${projectId}/milestones`, data);
export const updateMilestone = (projectId, milestoneId, completed) => axios.put(`${API_URL}/projects/${projectId}/milestones/${milestoneId}?completed=${completed}`);
export const deleteMilestone = (projectId, milestoneId) => axios.delete(`${API_URL}/projects/${projectId}/milestones/${milestoneId}`);

// Analytics
export const getAnalyticsOverview = () => axios.get(`${API_URL}/analytics/overview`);
export const getTimeTrackingAnalytics = () => axios.get(`${API_URL}/analytics/time-tracking`);
