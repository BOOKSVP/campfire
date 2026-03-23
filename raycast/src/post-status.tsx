import { Form, ActionPanel, Action, getPreferenceValues, showToast, Toast, popToRoot, Image, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchTeamUsers } from "./api";
import { postStatus } from "./api";
import { getExpiryDate } from "./utils";
import { TeamUser } from "./types";

interface Preferences {
  supabaseUrl: string;
  supabaseKey: string;
  yourName: string;
}

interface FormValues {
  userId: string;
  status: string;
  expiry: string;
}

export default function PostStatus() {
  const prefs = getPreferenceValues<Preferences>();
  const defaultUserId = prefs.yourName ?? "";

  const { data: users, isLoading } = useCachedPromise(fetchTeamUsers, [], {
    keepPreviousData: true,
  });

  async function handleSubmit(values: FormValues) {
    if (!values.status.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Status cannot be empty" });
      return;
    }

    const userId = parseInt(values.userId, 10);
    if (isNaN(userId)) {
      await showToast({ style: Toast.Style.Failure, title: "Please select a team member" });
      return;
    }

    const expiresAt = getExpiryDate(values.expiry);

    await showToast({ style: Toast.Style.Animated, title: "Posting status..." });

    try {
      await postStatus(userId, values.status.trim(), expiresAt);
      await showToast({ style: Toast.Style.Success, title: "Status posted!" });
      await popToRoot();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await showToast({ style: Toast.Style.Failure, title: "Failed to post status", message });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Post Status" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="userId" title="Team Member" defaultValue={defaultUserId}>
        {(users ?? []).map((user: TeamUser) => {
          const name = user.display_name || user.username;
          const icon: Image.ImageLike = user.profile_pic_url
            ? { source: user.profile_pic_url, mask: Image.Mask.Circle }
            : Icon.Person;
          return <Form.Dropdown.Item key={user.id} value={String(user.id)} title={name} icon={icon} />;
        })}
      </Form.Dropdown>

      <Form.TextArea
        id="status"
        title="Status"
        placeholder="What are you up to?"
        info="Max 280 characters"
      />

      <Form.Dropdown id="expiry" title="Expires" defaultValue="none">
        <Form.Dropdown.Item value="none" title="No expiry" />
        <Form.Dropdown.Item value="30min" title="30 minutes" />
        <Form.Dropdown.Item value="1hour" title="1 hour" />
        <Form.Dropdown.Item value="2hours" title="2 hours" />
        <Form.Dropdown.Item value="4hours" title="4 hours" />
        <Form.Dropdown.Item value="eod" title="End of day (5pm)" />
      </Form.Dropdown>
    </Form>
  );
}
