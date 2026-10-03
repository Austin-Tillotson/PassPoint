export interface PasswordEntry {
  id: string;
  folderId?: string | null;
  siteName: string;
  password: string;
  createdAtUtc: string;
}

export type NewPasswordEntry = Pick<PasswordEntry, 'siteName' | 'password'>;
