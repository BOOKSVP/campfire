import { MenuBarExtra, LaunchType, launchCommand, Icon, Image, showToast, Toast, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchUsersWithStatuses } from "./api";
import { UserWithStatus } from "./types";
import { timeAgo } from "./utils";

export default function MenuBar() {
  const { data, isLoading, revalidate } = useCachedPromise(fetchUsersWithStatuses, [], {
    keepPreviousData: true,
  });

  async function openTeamStatus() {
    try {
      await launchCommand({ name: "team-status", type: LaunchType.UserInitiated });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Could not open Team Status" });
    }
  }

  async function openPostStatus() {
    try {
      await launchCommand({ name: "post-status", type: LaunchType.UserInitiated });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Could not open Post Status" });
    }
  }

  return (
    <MenuBarExtra
      title="🔥"
      icon={{ source: Icon.Dot, tintColor: Color.Orange }}
      tooltip="Campfire — Team Status"
      isLoading={isLoading}
    >
      {(data ?? []).map(({ user, latestStatus }: UserWithStatus) => {
        const name = user.username;
        const statusText = latestStatus?.status ?? "No status";
        const subtitle = latestStatus ? timeAgo(latestStatus.created_at) : undefined;

        const icon: Image.ImageLike | undefined = user.profile_pic_url
          ? { source: user.profile_pic_url, mask: Image.Mask.Circle }
          : undefined;

        return (
          <MenuBarExtra.Item
            key={user.id}
            title={`${name}: ${statusText}`}
            subtitle={subtitle}
            icon={icon}
            onAction={openTeamStatus}
          />
        );
      })}

      <MenuBarExtra.Separator />

      <MenuBarExtra.Item
        title="Post Status"
        icon={Icon.Pencil}
        onAction={openPostStatus}
        shortcut={{ modifiers: ["cmd"], key: "p" }}
      />

      <MenuBarExtra.Item
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </MenuBarExtra>
  );
}
