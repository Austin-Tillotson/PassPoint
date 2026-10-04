export interface PasswordEntry {
  id: string;
  isFavorite?: boolean;
  folderId?: string | null;
  siteName: string;
  password: string;
  createdAtUtc: string;
}

export type NewPasswordEntry = Pick<PasswordEntry, 'siteName' | 'password' | 'folderId'>;
