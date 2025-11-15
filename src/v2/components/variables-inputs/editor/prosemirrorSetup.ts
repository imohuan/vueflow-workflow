import { Schema, Node as ProseMirrorNode } from "prosemirror-model";
import { EditorState, Plugin, PluginKey, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { history, undo, redo } from "prosemirror-history";

/**
 * 创建 ProseMirror Schema
 * 支持纯文本和变量标记
 */
export function createSchema(): Schema {
  return new Schema({
    nodes: {
      doc: {
        content: "text*",
      },
      text: {
        inline: true,
      },
    },
    marks: {
      variable: {
        attrs: {
          reference: { default: "" },
        },
        parseDOM: [
          {
            tag: "span.variable-token",
            getAttrs(dom: any) {
              return {
                reference: dom.getAttribute("data-reference") || "",
              };
            },
          },
        ],
        toDOM() {
          return [
            "span",
            {
              class: "variable-token",
              style:
                "color: #10b981; background-color: #ecfdf5; padding: 0 2px; border-radius: 2px;",
            },
          ];
        },
      },
    },
  });
}

/**
 * 创建变量高亮 Plugin
 * 自动识别 {{ ... }} 模式并应用装饰
 */
/**
 * 辅助函数：计算装饰
 */
function calculateDecorations(doc: any): Decoration[] {
  const decorations: Decoration[] = [];
  const VARIABLE_PATTERN = /\{\{\s*[^{}]+?\s*\}\}/g;

  doc.nodesBetween(
    0,
    doc.content.size,
    (node: ProseMirrorNode, pos: number) => {
      if (node.isText) {
        const text = node.text || "";
        let match: RegExpExecArray | null;
        VARIABLE_PATTERN.lastIndex = 0;

        while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
          const from = pos + match.index;
          const to = from + match[0].length;
          decorations.push(
            Decoration.inline(from, to, {
              class: "variable-token",
            })
          );
        }
      }
    }
  );

  return decorations;
}

export function createVariableHighlightPlugin(): Plugin {
  const pluginKey = new PluginKey("variableHighlight");

  return new Plugin({
    key: pluginKey,
    state: {
      init(config) {
        // 初始化时也计算装饰
        const decorations = calculateDecorations(config.doc!);
        return DecorationSet.create(config.doc!, decorations);
      },
      apply(
        _tr: Transaction,
        _value: DecorationSet,
        _oldState: EditorState,
        newState: EditorState
      ) {
        // 在文档变化时重新计算装饰
        const decorations = calculateDecorations(newState.doc);
        return DecorationSet.create(newState.doc, decorations);
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}

/**
 * 创建变量删除 Plugin
 * 当删除变量时，将整个变量作为一个单位删除
 */
export function createVariableDeletionPlugin(): Plugin {
  const VARIABLE_PATTERN = /\{\{\s*[^{}]+?\s*\}\}/g;

  return new Plugin({
    key: new PluginKey("variableDeletion"),
    props: {
      handleKeyDown(view, event) {
        if (event.key === "Backspace" || event.key === "Delete") {
          const { state, dispatch } = view;
          const { $from, $to } = state.selection;

          // 如果有选区，使用默认删除
          if ($from.pos !== $to.pos) {
            return false;
          }

          const text = state.doc.textContent;
          const pos = $from.pos - 1; // 光标前的位置

          if (event.key === "Backspace") {
            // 向后删除：检查光标前是否有变量
            const before = text.slice(0, pos + 1);
            let match: RegExpExecArray | null;
            let lastMatch: RegExpExecArray | null = null;

            VARIABLE_PATTERN.lastIndex = 0;
            while ((match = VARIABLE_PATTERN.exec(before)) !== null) {
              lastMatch = match;
            }

            if (
              lastMatch &&
              lastMatch.index + lastMatch[0].length === before.length
            ) {
              // 光标在变量末尾，删除整个变量
              const start = lastMatch.index + 1; // 转换为 ProseMirror 位置
              const end = start + lastMatch[0].length;
              dispatch(state.tr.delete(start, end));
              return true;
            }
          } else if (event.key === "Delete") {
            // 向前删除：检查光标后是否有变量
            const after = text.slice(pos + 1);
            const match = after.match(VARIABLE_PATTERN);

            if (match && match.index === 0) {
              // 光标在变量开头，删除整个变量
              const start = pos + 1;
              const end = start + match[0].length;
              dispatch(state.tr.delete(start, end));
              return true;
            }
          }
        }

        return false;
      },
    },
  });
}

/**
 * 创建编辑状态
 */
export function createEditorState(
  schema: Schema,
  initialContent: string = "",
  options?: {
    multiline?: boolean;
  }
): EditorState {
  const doc = schema.nodeFromJSON({
    type: "doc",
    content: initialContent
      ? [
          {
            type: "text",
            text: initialContent,
          },
        ]
      : [],
  });

  const keyBindings: { [key: string]: any } = {
    ...baseKeymap,
    "Mod-z": undo,
    "Mod-y": redo,
    "Mod-Shift-z": redo,
    ...(options?.multiline
      ? {
          Enter: (state: EditorState, dispatch?: (tr: Transaction) => void) => {
            if (!dispatch) return false;
            const { from, to } = state.selection;
            const tr = state.tr.insertText("\n", from, to);
            dispatch(tr.scrollIntoView());
            return true;
          },
        }
      : {
          // 单行模式下禁止换行
          Enter: () => true,
        }),
  };

  return EditorState.create({
    doc,
    plugins: [
      history(),
      createVariableHighlightPlugin(),
      createVariableDeletionPlugin(),
      keymap(keyBindings),
    ],
  });
}

/**
 * 获取编辑器的纯文本内容
 */
export function getEditorContent(state: EditorState): string {
  let content = "";
  state.doc.forEach((node: ProseMirrorNode) => {
    if (node.isText) {
      content += node.text;
    }
  });
  return content;
}

/**
 * 设置编辑器内容
 */
export function setEditorContent(
  state: EditorState,
  schema: Schema,
  content: string
): EditorState {
  const doc = schema.nodeFromJSON({
    type: "doc",
    content: content
      ? [
          {
            type: "text",
            text: content,
          },
        ]
      : [],
  });

  return state.apply(
    state.tr.replaceWith(0, state.doc.content.size, doc.content)
  );
}
