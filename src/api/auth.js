import api from './client';

export const loginUser = async (email, password) => {
  const res = await api.post('auth/login/', {
    email,
    password,
  });
  return res.data;
};

export const registerUser = async (payload) => {
  const res = await api.post('auth/register/', payload);
  return res.data;
};
