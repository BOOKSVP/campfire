import { MenuBarExtra, LaunchType, launchCommand, Icon, Image, showToast, Toast, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchUsersWithStatuses } from "./api";
import { UserWithStatus } from "./types";
import { timeAgo } from "./utils";
import { useEffect, useState } from "react";

const LAST_SEEN_KEY = "campfire_last_seen_ts";

export default function MenuBar() {
  const [hasNew, setHasNew] = useState(false);
  const [lastSeenTs, setLastSeenTs] = useState<number>(0);

  const { data, isLoading, revalidate } = useCachedPromise(fetchUsersWithStatuses, [], {
    keepPreviousData: true,
  });

  // Load last seen timestamp on mount
  useEffect(() => {
    LocalStorage.getItem<string>(LAST_SEEN_KEY).then((val) => {
      if (val) setLastSeenTs(parseInt(val, 10));
    });
  }, []);

  // Check if any status is newer than last seen
  useEffect(() => {
    if (!data || !lastSeenTs) {
      // If never seen before, check if there are any statuses at all
      if (data && data.some((d: UserWithStatus) => d.latestStatus)) {
        setHasNew(true);
      }
      return;
    }

    const hasNewStatus = data.some((d: UserWithStatus) => {
      if (!d.latestStatus) return false;
      const statusTs = new Date(d.latestStatus.created_at).getTime();
      return statusTs > lastSeenTs;
    });

    setHasNew(hasNewStatus);
  }, [data, lastSeenTs]);

  // When menu is opened, mark as seen
  async function markSeen() {
    const now = Date.now();
    await LocalStorage.setItem(LAST_SEEN_KEY, String(now));
    setLastSeenTs(now);
    setHasNew(false);
  }

  async function openTeamStatus() {
    await markSeen();
    try {
      await launchCommand({ name: "team-status", type: LaunchType.UserInitiated });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Could not open Team Status" });
    }
  }

  async function openPostStatus() {
    await markSeen();
    try {
      await launchCommand({ name: "post-status", type: LaunchType.UserInitiated });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Could not open Post Status" });
    }
  }

  const menuIcon = hasNew ? "flame-color.png" : "flame-grey.png";

  return (
    <MenuBarExtra
      icon={{ source: menuIcon }}
      tooltip={hasNew ? "Campfire — New updates!" : "Campfire — Team Status"}
      isLoading={isLoading}
    >
      {(data ?? []).map(({ user, latestStatus }: UserWithStatus) => {
        const name = user.username;
        const statusText = latestStatus?.status ?? "No status";
        const subtitle = latestStatus ? timeAgo(latestStatus.created_at) : undefined;
        const isNew = latestStatus && lastSeenTs > 0 &&
          new Date(latestStatus.created_at).getTime() > lastSeenTs;

        const icon: Image.ImageLike | undefined = user.profile_pic_url
          ? { source: user.profile_pic_url, mask: Image.Mask.Circle }
          : undefined;

        return (
          <MenuBarExtra.Item
            key={user.id}
            title={`${isNew ? "● " : ""}${name}: ${statusText}`}
            subtitle={subtitle}
            icon={icon}
            onAction={() => { markSeen(); openTeamStatus(); }}
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
        onAction={() => { markSeen(); revalidate(); }}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </MenuBarExtra>
  );
}
