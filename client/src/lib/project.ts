const PROJECT_STORAGE_KEY = "easyhost-project-id";

export const selectedProjectId = () => localStorage.getItem(PROJECT_STORAGE_KEY);

export const selectProject = (projectId: string) => {
  localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
};

export const clearSelectedProject = () => {
  localStorage.removeItem(PROJECT_STORAGE_KEY);
};
