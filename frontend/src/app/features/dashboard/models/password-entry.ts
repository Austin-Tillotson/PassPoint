export interface PasswordEntry {
  id: string;
  isFavorite?: boolean;
  folderId?: string | null;
  siteName: string;
  username?: string | null;
  password: string;
  createdAtUtc: string;
}

export type NewPasswordEntry = Pick<PasswordEntry, 'siteName' | 'username' | 'password' | 'folderId'>;
