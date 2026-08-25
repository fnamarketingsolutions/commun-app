import { useDispatch, useSelector } from 'react-redux';
import {
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from '../redux/service/api';
import { clearUser } from '../redux/slices/authSlice';
import { clearToken } from '../utils/tokenStorage';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, isLoggedIn, isLoading } = useSelector((state) => state.auth);

  const [loginMutation] = useLoginMutation();
  const [logoutMutation] = useLogoutMutation();
  const [registerMutation] = useRegisterMutation();

  const login = async (email, password) => {
    try {
      await loginMutation({ email, password }).unwrap();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const register = async (userData) => {
    try {
      await registerMutation(userData).unwrap();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const logout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch (error) {
      // Server call failed (offline, expired token, baseURL misconfig, etc.)
      // We still log the user out locally — never trap them in a logged-in UI.
    } finally {
      dispatch(clearUser());
      await clearToken();
    }
    return { success: true };
  };

  return { user, isLoggedIn, isLoading, login, register, logout };
};