import {
  List,
  ActionPanel,
  Action,
  Icon,
  Image,
  LaunchType,
  launchCommand,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { fetchUsersWithStatuses, fetchUserHistory } from "./api";
import { UserWithStatus, StatusUpdate } from "./types";
import { timeAgo, isExpired } from "./utils";

function UserHistoryList({ userId, userName }: { userId: number; userName: string }) {
  const { data: history, isLoading } = usePromise(fetchUserHistory, [userId]);

  return (
    <List isLoading={isLoading} navigationTitle={`${userName}'s History`}>
      {(history ?? []).map((update: StatusUpdate) => {
        const expired = isExpired(update.expires_at);
        const accessories: List.Item.Accessory[] = [{ text: timeAgo(update.created_at) }];
        if (update.expires_at) {
          accessories.push({
            text: expired ? "Expired" : `Expires ${timeAgo(update.expires_at)}`,
            icon: expired ? Icon.XMarkCircle : Icon.Clock,
          });
        }

        return (
          <List.Item
            key={update.id}
            title={update.status}
            accessories={accessories}
          />
        );
      })}
      {!isLoading && (history ?? []).length === 0 && (
        <List.EmptyView title="No status history" description="This user hasn't posted any statuses yet." />
      )}
    </List>
  );
}

export default function TeamStatus() {
  const { data, isLoading, revalidate } = useCachedPromise(fetchUsersWithStatuses, [], {
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} navigationTitle="Team Status">
      {(data ?? []).map(({ user, latestStatus }: UserWithStatus) => {
        const name = user.display_name || user.username;
        const statusText = latestStatus?.status ?? "No status";

        const icon: Image.ImageLike = user.profile_pic_url
          ? { source: user.profile_pic_url, mask: Image.Mask.Circle }
          : Icon.Person;

        const accessories: List.Item.Accessory[] = [];
        if (latestStatus) {
          accessories.push({ text: timeAgo(latestStatus.created_at) });
        }

        return (
          <List.Item
            key={user.id}
            icon={icon}
            title={name}
            subtitle={statusText}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View History"
                  icon={Icon.List}
                  target={<UserHistoryList userId={user.id} userName={name} />}
                />
                <Action
                  title="Post Status"
                  icon={Icon.Pencil}
                  onAction={async () => {
                    try {
                      await launchCommand({ name: "post-status", type: LaunchType.UserInitiated });
                    } catch {
                      await showToast({ style: Toast.Style.Failure, title: "Could not open Post Status" });
                    }
                  }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && (data ?? []).length === 0 && (
        <List.EmptyView title="No team members found" description="Check your Supabase configuration." />
      )}
    </List>
  );
}
