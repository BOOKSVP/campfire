import { MenuBarExtra, LaunchType, launchCommand, Icon, Image, showToast, Toast, LocalStorage, environment } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchUsersWithStatuses } from "./api";
import { UserWithStatus } from "./types";
import { timeAgo } from "./utils";
import { useEffect, useState, useRef } from "react";

const LAST_SEEN_KEY = "campfire_last_seen_ts";

export default function MenuBar() {
  const [hasNew, setHasNew] = useState(false);
  const [lastSeenTs, setLastSeenTs] = useState<number>(0);
  const hasMarkedSeen = useRef(false);

  const { data, isLoading, revalidate } = useCachedPromise(fetchUsersWithStatuses, [], {
    keepPreviousData: true,
  });

  // Load last seen timestamp on mount
  useEffect(() => {
    LocalStorage.getItem<string>(LAST_SEEN_KEY).then((val) => {
      if (val) setLastSeenTs(parseInt(val, 10));
    });
  }, []);

  // Check for new statuses (background refresh)
  useEffect(() => {
    if (!data) return;

    const newestTs = Math.max(
      ...data.map((d: UserWithStatus) =>
        d.latestStatus ? new Date(d.latestStatus.created_at).getTime() : 0
      )
    );

    setHasNew(lastSeenTs > 0 ? newestTs > lastSeenTs : newestTs > 0);
  }, [data, lastSeenTs]);

  // When launched by user (dropdown opened), mark as seen
  useEffect(() => {
    if (environment.launchType === LaunchType.UserInitiated && !hasMarkedSeen.current && data) {
      hasMarkedSeen.current = true;
      const now = Date.now();
      LocalStorage.setItem(LAST_SEEN_KEY, String(now));
      setLastSeenTs(now);
      setHasNew(false);
    }
  }, [data]);

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
