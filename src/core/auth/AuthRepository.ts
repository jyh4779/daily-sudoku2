import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { getAuth, GoogleAuthProvider, signInAnonymously as firebaseSignInAnonymously, signInWithCredential, linkWithCredential, signOut as firebaseSignOut, onAuthStateChanged } from '@react-native-firebase/auth';
import AppLogger from '../logger/AppLogger';

import { AUTH_CONFIG } from '../../config/auth';

export const initGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: AUTH_CONFIG.WEB_CLIENT_ID,
  });
};

export const signInAnonymously = async () => {
  try {
    const authInstance = getAuth();
    const userCredential = await firebaseSignInAnonymously(authInstance);
    await AppLogger.info('AUTH', 'Anonymous Sign-In success', { uid: userCredential.user.uid });
    return userCredential.user;
  } catch (error: any) {
    await AppLogger.error('AUTH', 'Anonymous Sign-In failed', { error: error.message });
    throw error;
  }
};

export const signInWithGoogle = async () => {
  try {
    // Ensure configuration is set before sign-in
    GoogleSignin.configure({
      webClientId: AUTH_CONFIG.WEB_CLIENT_ID,
    });

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const signInResult = await GoogleSignin.signIn();

    // If sign-in was cancelled or failed to return data, throw an error
    if (!signInResult.data) {
      const error = new Error('Sign in cancelled or failed');
      // @ts-ignore
      error.code = statusCodes.SIGN_IN_CANCELLED;
      throw error;
    }

    let idToken = signInResult.data.idToken;
    if (!idToken) {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens.idToken;
    }

    if (!idToken) {
      throw new Error('No ID token found');
    }

    const googleCredential = GoogleAuthProvider.credential(idToken);
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;

    if (currentUser && currentUser.isAnonymous) {
      try {
        const userCredential = await linkWithCredential(currentUser, googleCredential);
        await AppLogger.info('AUTH', 'Account Linked success', { uid: userCredential.user.uid });
        return userCredential.user;
      } catch (linkError: any) {
        if (linkError.code === 'auth/credential-already-in-use') {
          await AppLogger.warn('AUTH', 'Credential already in use, switching accounts');
          const userCredential = await signInWithCredential(authInstance, googleCredential);
          return userCredential.user;
        }
        throw linkError;
      }
    } else {
      const userCredential = await signInWithCredential(authInstance, googleCredential);
      await AppLogger.info('AUTH', 'Google Sign-In success', { uid: userCredential.user.uid });
      return userCredential.user;
    }
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      await AppLogger.info('AUTH', 'Google Sign-In cancelled');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      await AppLogger.warn('AUTH', 'Google Sign-In in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      await AppLogger.error('AUTH', 'Play Services not available');
    } else {
      await AppLogger.error('AUTH', 'Google Sign-In failed', { error: error.message });
    }
    throw error;
  }
};

export const signOut = async () => {
  try {
    await GoogleSignin.signOut();
    await firebaseSignOut(getAuth());
    await AppLogger.info('AUTH', 'Signed out');
  } catch (error: any) {
    await AppLogger.error('AUTH', 'Sign out failed', { error: error.message });
  }
};

export const getCurrentUser = () => {
  return getAuth().currentUser;
};

export const waitForAuthInit = (): Promise<any | null> => {
  return new Promise(resolve => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      resolve(user);
    });
  });
};
