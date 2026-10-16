import {
  BoxRenderable,
  bold,
  type CliRenderer,
  createCliRenderer,
  InputRenderable,
  TextRenderable,
  t,
} from "@opentui/core";

export type SettingsDraft = {
  repository: string;
  interval: string;
  model: string;
  assignee: string;
};

export type MainView = {
  repository: string;
  intervalLabel: string;
  model: string;
  assignee: string;
  status: string;
  quitKey: string;
};

type SettingsInputs = {
  repository: InputRenderable;
  interval: InputRenderable;
  model: InputRenderable;
  assignee: InputRenderable;
};

function mainTopLine(view: MainView): string {
  return [view.repository, view.intervalLabel, view.model, view.assignee].join(" ");
}

function mountMainView(renderer: CliRenderer, view: MainView): void {
  const column = new BoxRenderable(renderer, {
    flexDirection: "column",
    width: "100%",
    height: "100%",
  });
  const textOptions = { wrapMode: "char" as const, width: "100%" as const };
  column.add(new TextRenderable(renderer, { ...textOptions, content: mainTopLine(view) }));
  column.add(new TextRenderable(renderer, { ...textOptions, content: view.status }));
  column.add(new TextRenderable(renderer, { ...textOptions, content: view.quitKey }));
  renderer.root.add(column);
}

function settingsRow(
  renderer: CliRenderer,
  label: string,
  input: InputRenderable,
  suffix?: string,
): BoxRenderable {
  const row = new BoxRenderable(renderer, {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    gap: 1,
  });
  row.add(new TextRenderable(renderer, { content: t`${bold(label)}` }));
  row.add(input);
  if (suffix !== undefined) {
    row.add(new TextRenderable(renderer, { content: suffix }));
  }
  return row;
}

function mountSettingsView(
  renderer: CliRenderer,
  draft: SettingsDraft,
  message: string,
): { inputs: SettingsInputs; setMessage: (next: string) => void } {
  const inputs: SettingsInputs = {
    repository: new InputRenderable(renderer, { value: draft.repository, flexGrow: 1 }),
    interval: new InputRenderable(renderer, { value: draft.interval, flexGrow: 1 }),
    model: new InputRenderable(renderer, { value: draft.model, flexGrow: 1 }),
    assignee: new InputRenderable(renderer, { value: draft.assignee, flexGrow: 1 }),
  };
  const messageText = new TextRenderable(renderer, {
    content: message,
    wrapMode: "char",
    width: "100%",
  });
  const column = new BoxRenderable(renderer, {
    flexDirection: "column",
    width: "100%",
    height: "100%",
    gap: 1,
  });
  column.add(settingsRow(renderer, "repository", inputs.repository));
  column.add(settingsRow(renderer, "interval", inputs.interval, "分"));
  column.add(settingsRow(renderer, "model", inputs.model));
  column.add(settingsRow(renderer, "assignee", inputs.assignee));
  column.add(messageText);
  renderer.root.add(column);
  return {
    inputs,
    setMessage: (next) => {
      messageText.content = next;
    },
  };
}

function collectSettingsDraft(inputs: SettingsInputs): SettingsDraft {
  return {
    repository: inputs.repository.value,
    interval: inputs.interval.value,
    model: inputs.model.value,
    assignee: inputs.assignee.value,
  };
}

function isQuitKey(key: { name: string; ctrl: boolean; meta: boolean }): boolean {
  return key.name === "q" && !key.ctrl && !key.meta;
}

function isCancelKey(sequence: string): boolean {
  return sequence === "\x03";
}

async function finishRenderer(renderer: CliRenderer): Promise<void> {
  renderer.destroy();
  await renderer.closed;
}

export async function runMain(view: MainView): Promise<"quit"> {
  const renderer = await createCliRenderer({ exitOnCtrlC: false });
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      void finishRenderer(renderer).then(() => resolve("quit"));
    };
    mountMainView(renderer, view);
    renderer.root.focusable = true;
    renderer.root.focus();
    renderer.root.onKeyDown = (key) => {
      if ((key.ctrl && key.name === "c") || isQuitKey(key)) {
        key.preventDefault();
        finish();
      }
    };
    renderer.prependInputHandler((sequence) => {
      if (isCancelKey(sequence)) {
        finish();
        return true;
      }
      return false;
    });
  });
}

export async function runSettings(
  draft: SettingsDraft,
  submit: (next: SettingsDraft) => Promise<{ ok: true } | { ok: false; message: string }>,
): Promise<"saved" | "cancel"> {
  const renderer = await createCliRenderer({ exitOnCtrlC: false });
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: "saved" | "cancel") => {
      if (settled) {
        return;
      }
      settled = true;
      void finishRenderer(renderer).then(() => resolve(result));
    };
    const { inputs, setMessage } = mountSettingsView(renderer, draft, "");
    const trySubmit = async () => {
      const result = await submit(collectSettingsDraft(inputs));
      if (result.ok) {
        finish("saved");
        return;
      }
      setMessage(result.message);
    };
    for (const input of Object.values(inputs)) {
      input.onSubmit = () => {
        void trySubmit();
      };
    }
    renderer.prependInputHandler((sequence) => {
      if (isCancelKey(sequence)) {
        finish("cancel");
        return true;
      }
      return false;
    });
    inputs.repository.focus();
  });
}
