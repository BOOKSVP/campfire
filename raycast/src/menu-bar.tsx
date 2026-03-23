import { MenuBarExtra, LaunchType, launchCommand, Icon, Image, showToast, Toast, LocalStorage } from "@raycast/api";
import { fetchUsersWithStatuses } from "./api";
import { UserWithStatus } from "./types";
import { timeAgo } from "./utils";
import { useEffect, useState, useCallback } from "react";

const LAST_SEEN_KEY = "campfire_last_seen_ts";
const POLL_INTERVAL = 10000; // 10 seconds

export default function MenuBar() {
  const [hasNew, setHasNew] = useState(false);
  const [lastSeenTs, setLastSeenTs] = useState<number>(0);
  const [data, setData] = useState<UserWithStatus[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const result = await fetchUsersWithStatuses();
      setData(result);
      setIsLoading(false);

      // Check last seen from storage (might have been updated by Post Status)
      const stored = await LocalStorage.getItem<string>(LAST_SEEN_KEY);
      const seenTs = stored ? parseInt(stored, 10) : 0;
      setLastSeenTs(seenTs);

      const newestTs = Math.max(
        0,
        ...result.map((d: UserWithStatus) =>
          d.latestStatus ? new Date(d.latestStatus.created_at).getTime() : 0
        )
      );

      setHasNew(newestTs > seenTs);
    } catch (e) {
      console.error("Fetch failed:", e);
    }
  }, []);

  // Initial fetch + polling every 10s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

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
            onAction={() => openTeamStatus()}
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
        title="Mark as Read"
        icon={Icon.Checkmark}
        onAction={markSeen}
      />
    </MenuBarExtra>
  );
}
