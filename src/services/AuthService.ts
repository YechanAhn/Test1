// ============================================
// 인증 서비스
// Firebase Authentication 기반
// ============================================

import { User } from '../types';

/**
 * 사용자 인증을 관리합니다.
 * 구글 로그인, 이메일/비밀번호 로그인을 지원합니다.
 */
export class AuthService {
  /** 이메일/비밀번호로 회원가입 */
  async signUp(email: string, password: string, displayName: string): Promise<User> {
    // const credential = await auth().createUserWithEmailAndPassword(email, password);
    // await credential.user.updateProfile({ displayName });

    const user: User = {
      id: this.generateId(),
      displayName,
      email,
      calendarIds: [],
      createdAt: new Date().toISOString(),
    };

    // Firestore에 사용자 문서 생성
    // await firestore().collection('users').doc(user.id).set(user);

    console.log(`[AuthService] User signed up: ${email}`);
    return user;
  }

  /** 이메일/비밀번호로 로그인 */
  async signIn(email: string, password: string): Promise<User | null> {
    // const credential = await auth().signInWithEmailAndPassword(email, password);
    // const userDoc = await firestore().collection('users').doc(credential.user.uid).get();
    // return userDoc.data() as User;

    console.log(`[AuthService] User signed in: ${email}`);
    return null;
  }

  /** 구글 소셜 로그인 */
  async signInWithGoogle(): Promise<User | null> {
    // const { idToken } = await GoogleSignin.signIn();
    // const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    // const credential = await auth().signInWithCredential(googleCredential);

    console.log('[AuthService] Google sign-in');
    return null;
  }

  /** 로그아웃 */
  async signOut(): Promise<void> {
    // await auth().signOut();
    console.log('[AuthService] User signed out');
  }

  /** 현재 로그인 상태 확인 */
  async getCurrentUser(): Promise<User | null> {
    // const firebaseUser = auth().currentUser;
    // if (!firebaseUser) return null;
    // const userDoc = await firestore().collection('users').doc(firebaseUser.uid).get();
    // return userDoc.data() as User;
    return null;
  }

  /** 인증 상태 변경 리스너 */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    // return auth().onAuthStateChanged(async (firebaseUser) => {
    //   if (firebaseUser) {
    //     const userDoc = await firestore().collection('users').doc(firebaseUser.uid).get();
    //     callback(userDoc.data() as User);
    //   } else {
    //     callback(null);
    //   }
    // });
    return () => {};
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

export default AuthService;
