import { Form, ActionPanel, Action, getPreferenceValues, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { postStatus } from "./api";
import { getExpiryDate } from "./utils";

interface Preferences {
  supabaseUrl: string;
  supabaseKey: string;
  yourName: string;
}

interface FormValues {
  status: string;
  expiry: string;
}

export default function PostStatus() {
  const prefs = getPreferenceValues<Preferences>();
  const userId = parseInt(prefs.yourName, 10);

  async function handleSubmit(values: FormValues) {
    if (!values.status.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Status cannot be empty" });
      return;
    }

    if (isNaN(userId)) {
      await showToast({ style: Toast.Style.Failure, title: "Set your name in extension preferences first" });
      return;
    }

    const expiresAt = getExpiryDate(values.expiry);

    await showToast({ style: Toast.Style.Animated, title: "Posting status..." });

    try {
      await postStatus(userId, values.status.trim(), expiresAt);
      await showToast({ style: Toast.Style.Success, title: "Status posted! 🔥" });
      await popToRoot();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await showToast({ style: Toast.Style.Failure, title: "Failed to post status", message });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Post Status" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="status"
        title="Status"
        placeholder="What are you working on?"
        info="Max 280 characters"
        autoFocus
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
