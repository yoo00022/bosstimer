
// Use a namespaced import for 'firebase/app' to resolve potential "no exported member" issues
// in certain TypeScript/bundler configurations while maintaining compatibility with the v9 modular SDK.
import * as firebase from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 使用您提供的最新 Firebase 配置 (woodboss-af2a7)
const firebaseConfig = {
  apiKey: "AIzaSyAUAWcpOwm_FQhumVMpqcRVJauWDelfY2A",
  authDomain: "woodboss-af2a7.firebaseapp.com",
  projectId: "woodboss-af2a7",
  storageBucket: "woodboss-af2a7.firebasestorage.app",
  messagingSenderId: "310421615062",
  appId: "1:310421615062:web:a9084ded43cf6e42327477"
};

// 初始化 Firebase，使用 namespaced 方式解決某些環境下 named export 識別問題
// 同時檢查是否已存在初始化過的 app 以確保在 HMR 或多重渲染環境下的穩定性
const app = firebase.getApps().length === 0 
  ? firebase.initializeApp(firebaseConfig) 
  : firebase.getApp();

// 導出 Firestore 資料庫實例，供全站同步使用
export const db = getFirestore(app);
