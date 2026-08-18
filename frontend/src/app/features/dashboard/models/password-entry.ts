export interface PasswordEntry {
  id: string;
  siteName: string;
  password: string;
  createdAtUtc: string;
}

export type NewPasswordEntry = Pick<PasswordEntry, 'siteName' | 'password'>;