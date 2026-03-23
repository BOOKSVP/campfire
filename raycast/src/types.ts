export interface TeamUser {
  id: number;
  username: string;
  display_name: string | null;
  profile_pic_url: string | null;
  team_id: number;
}

export interface StatusUpdate {
  id: number;
  team_id: number;
  team_user_id: number;
  status: string;
  expires_at: string | null;
  created_at: string;
}

export interface UserWithStatus {
  user: TeamUser;
  latestStatus: StatusUpdate | null;
}
