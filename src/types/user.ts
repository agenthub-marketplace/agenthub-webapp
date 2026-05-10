export type UserRole = "user" | "creator" | "admin";

export type Profile = {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type CreatorProfile = {
  id: string;
  userId: string;
  publicName: string;
  bio: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
