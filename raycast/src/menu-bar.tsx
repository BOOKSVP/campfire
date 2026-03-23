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
  const [loaded, setLoaded] = useState(false);

  const { data, isLoading, revalidate } = useCachedPromise(fetchUsersWithStatuses, [], {
    keepPreviousData: true,
  });

  // Load last seen timestamp
  useEffect(() => {
    LocalStorage.getItem<string>(LAST_SEEN_KEY).then((val) => {
      setLastSeenTs(val ? parseInt(val, 10) : 0);
      setLoaded(true);
    });
  }, []);

  // Compare newest status to last seen
  useEffect(() => {
    if (!data || !loaded) return;

    const newestTs = Math.max(
      0,
      ...data.map((d: UserWithStatus) =>
        d.latestStatus ? new Date(d.latestStatus.created_at).getTime() : 0
      )
    );

    // New if there's a status newer than what we last acknowledged
    setHasNew(newestTs > lastSeenTs);
  }, [data, lastSeenTs, loaded]);

  // Mark as seen — only called on explicit user action
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

  async function handleRefresh() {
    await markSeen();
    revalidate();
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
        onAction={handleRefresh}
      />
    </MenuBarExtra>
  );
}
