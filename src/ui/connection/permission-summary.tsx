export type PermissionSummaryModel = {
  heading: string;
  lines: string[];
};

export function buildPermissionSummary(): PermissionSummaryModel {
  return {
    heading: "Before you connect",
    lines: [
      "We only read your currently playing track and playback position.",
      "We do not control playback, edit playlists, or post to your account.",
      "You can disconnect anytime from connection settings.",
    ],
  };
}
