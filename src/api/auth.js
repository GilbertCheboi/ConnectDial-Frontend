import api from './client';

export const loginUser = async (username, password) => {
  const res = await api.post('auth/login/', {
    username: username, // Django expects 'username' unless configured otherwise
    password: password,
  });
  return res.data;
};
export const registerUser = async payload => {
  // Make sure you are passing the 'payload' object directly to axios
  const res = await api.post('auth/register/', payload);
  return res.data;
};
