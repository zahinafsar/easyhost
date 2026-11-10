import { useEffect, useRef } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/language/json/json.worker?worker";
import CssWorker from "monaco-editor/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/language/html/html.worker?worker";
import TsWorker from "monaco-editor/language/typescript/ts.worker?worker";

self.MonacoEnvironment = {
  getWorker: (_id: string, label: string) => {
    if (label === "json") {
      return new JsonWorker();
    }
    if (label === "css" || label === "scss" || label === "less") {
      return new CssWorker();
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return new HtmlWorker();
    }
    if (label === "typescript" || label === "javascript") {
      return new TsWorker();
    }
    return new EditorWorker();
  },
};

loader.config({ monaco });

const LANGUAGES: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  html: "html",
  htm: "html",
  css: "css",
  md: "markdown",
  sql: "sql",
  svg: "xml",
  xml: "xml",
  yml: "yaml",
  yaml: "yaml",
  sh: "shell",
};

const languageFor = (path: string) => {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGES[extension] ?? "plaintext";
};

export const MonacoEditor = ({
  path,
  value,
  readOnly,
  onChange,
  onSave,
}: {
  path: string;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}) => {
  const saveRef = useRef(onSave);

  useEffect(() => {
    saveRef.current = onSave;
  }, [onSave]);

  const handleMount: OnMount = (editor, instance) => {
    editor.addCommand(instance.KeyMod.CtrlCmd | instance.KeyCode.KeyS, () => {
      saveRef.current();
    });
  };

  return (
    <Editor
      path={path}
      language={languageFor(path)}
      value={value}
      theme="vs-dark"
      onMount={handleMount}
      onChange={(next) => onChange(next ?? "")}
      loading={<div className="h-full w-full bg-[#1e1e1e]" />}
      options={{
        readOnly,
        fontSize: 13,
        tabSize: 2,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
        renderWhitespace: "selection",
        padding: { top: 12 },
      }}
    />
  );
};
