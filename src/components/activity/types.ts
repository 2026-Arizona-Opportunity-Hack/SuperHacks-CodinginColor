import type { PlayerActivity, SubmitResponse } from "./Player";

export type ViewProps = {
  activity: PlayerActivity;
  submit: (payload: Record<string, unknown>) => Promise<SubmitResponse>;
  onContinue: () => void;
  isLast: boolean;
};
