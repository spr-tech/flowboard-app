import type { User } from "./user";

export type Member = {
  id: string;
  role: string;
  createdAt: Date;
  userId: string;
  projectId: string;
  user: User;
};
