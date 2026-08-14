export interface PasswordEntry {
  id: number;
  siteName: string;
  password: string;
}

export type NewPasswordEntry = Omit<PasswordEntry, 'id'>;