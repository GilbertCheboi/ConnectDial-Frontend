const API_BASE = 'http://10.85.243.94:8000/auth/social'; 

export const googleLogin = async () => {
    try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        console.log('GoogleSignin object:', GoogleSignin);

        const idToken = userInfo.idToken;

        console.log('Google ID Token:', idToken); // <--- add this

        const response = await axios.post(`${API_BASE}/google/`, {
            access_token: idToken
        });

        console.log('Response from backend:', response.data); // <--- add this

        await AsyncStorage.setItem('access', response.data.access);
        await AsyncStorage.setItem('refresh', response.data.refresh);

        return response.data.user;
    } catch (error) {
        console.error('Google login error', error.response?.data || error.message);
        throw error;
    }
};
