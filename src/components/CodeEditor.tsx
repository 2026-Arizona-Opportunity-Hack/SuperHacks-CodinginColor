"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <div className="h-[280px] animate-pulse rounded-2xl border border-line bg-raised" />,
});

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => {
      setDark(document.documentElement.dataset.theme === "dark");
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export function CodeEditor({ value, onChange, label, minHeight = "280px" }: { value: string; onChange: (v: string) => void; label: string; minHeight?: string }) {
  const dark = useDark();
  return (
    <div className="overflow-hidden rounded-2xl border border-line text-[15px]" dir="ltr">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={dark ? "dark" : "light"}
        minHeight={minHeight}
        extensions={[python(), EditorView.lineWrapping, EditorView.contentAttributes.of({ "aria-label": `Python code editor: ${label}` })]}
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true, autocompletion: true, tabSize: 4 }}
        indentWithTab={false}
      />
    </div>
  );
}
