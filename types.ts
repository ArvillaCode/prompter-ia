export enum AppMode {
  EDITOR = 'EDITOR',
  PROMPTER = 'PROMPTER'
}

export interface PrompterSettings {
  scrollSpeed: number; // 0 to 100
  fontSize: number; // pixel value
  isMirroredX: boolean; // For beam splitter glass
  isMirroredY: boolean; // Vertical flip
  useCamera: boolean;
  margin: number; // percentage
  opacity: number; // text opacity
  lineHeight: number;
  audioDeviceId?: string; // selected microphone (undefined = browser default)
  videoDeviceId?: string; // selected camera (undefined = browser default)
  facingMode?: 'user' | 'environment'; // 'user' = front camera, 'environment' = back/main camera
}

export interface SavedScript {
  id: string;
  title: string;
  content: string;
  updatedAt: number; // epoch ms
}

export type UserRole = 'user' | 'admin' | 'superadmin';
export type UserPlan = 'free' | 'pro' | 'team';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  plan?: UserPlan;
}