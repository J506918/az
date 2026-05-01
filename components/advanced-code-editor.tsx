import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { sshService } from '@/lib/ssh-service';

interface CodeDiagnostic {
  line: number;
  column: number;
  message: string;
  type: 'error' | 'warning';
}

interface AdvancedCodeEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  language?: string;
  filePath?: string;
  colors: any;
  style?: any;
}

// ─── Python 错误信息中文化 ─────────────────────────────────────────────────────

function translatePythonError(msg: string): string {
  // SyntaxError messages from CPython
  if (/invalid syntax/i.test(msg)) return '语法错误';
  if (/unexpected EOF/i.test(msg)) return '代码未完整结束（括号或引号未闭合）';
  if (/unexpected indent/i.test(msg)) return '意外的缩进';
  if (/unindent does not match/i.test(msg)) return '缩进不匹配';
  if (/expected an indented block/i.test(msg)) return '此处需要缩进块';
  if (/EOL while scanning string literal/i.test(msg)) return '字符串未闭合（缺少引号）';
  if (/EOF while scanning triple-quoted string/i.test(msg)) return '三引号字符串未闭合';
  if (/invalid character/i.test(msg)) return '包含无效字符';
  if (/cannot assign to/i.test(msg)) return '赋值目标无效';
  if (/duplicate argument/i.test(msg)) return '函数参数重复';
  if (/positional argument follows keyword/i.test(msg)) return '关键字参数后不能有位置参数';
  if (/non-default argument follows default/i.test(msg)) return '默认参数后不能有非默认参数';
  if (/f-string/i.test(msg)) return 'f-string 格式错误';
  if (/invalid decimal literal/i.test(msg)) return '无效的数字字面量';
  if (/leading zeros/i.test(msg)) return '数字不能有前导零';
  if (/import/i.test(msg)) return '导入语句错误';
  if (/IndentationError/i.test(msg)) return '缩进错误';
  if (/TabError/i.test(msg)) return '制表符与空格混用错误';
  // Return original if no match
  return msg;
}

// ─── JS/TS 括号平衡检查 ────────────────────────────────────────────────────────

function checkBracketBalance(code: string): CodeDiagnostic[] {
  const diagnostics: CodeDiagnostic[] = [];
  const stack: Array<{ char: string; line: number; col: number }> = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const opens = new Set(['(', '[', '{']);
  const closes = new Set([')', ']', '}']);

  let line = 1;
  let col = 1;
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  let i = 0;

  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1] ?? '';

    // Track newlines
    if (ch === '\n') {
      line++;
      col = 1;
      inLineComment = false;
      i++;
      continue;
    }

    // Block comment
    if (!inString && !inLineComment && ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2; col += 2;
      continue;
    }
    if (inBlockComment && ch === '*' && next === '/') {
      inBlockComment = false;
      i += 2; col += 2;
      continue;
    }
    if (inBlockComment) { i++; col++; continue; }

    // Line comment
    if (!inString && ch === '/' && next === '/') {
      inLineComment = true;
      i++; col++;
      continue;
    }
    if (inLineComment) { i++; col++; continue; }

    // String tracking (simple, handles ' " ` but not all edge cases)
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch;
      i++; col++;
      continue;
    }
    if (inString) {
      if (ch === '\\') { i += 2; col += 2; continue; } // escape
      if (ch === inString) { inString = null; }
      i++; col++;
      continue;
    }

    // Bracket tracking
    if (opens.has(ch)) {
      stack.push({ char: ch, line, col });
    } else if (closes.has(ch)) {
      const expected = pairs[ch];
      if (stack.length === 0) {
        diagnostics.push({
          line,
          column: col,
          message: `多余的 '${ch}'`,
          type: 'error',
        });
      } else {
        const top = stack[stack.length - 1];
        if (top.char !== expected) {
          diagnostics.push({
            line,
            column: col,
            message: `括号不匹配：'${ch}' 与 '${top.char}' 不对应（第 ${top.line} 行）`,
            type: 'error',
          });
          stack.pop();
        } else {
          stack.pop();
        }
      }
    }

    i++; col++;
  }

  // Unclosed brackets
  for (const item of stack) {
    diagnostics.push({
      line: item.line,
      column: item.col,
      message: `'${item.char}' 未闭合`,
      type: 'error',
    });
  }

  return diagnostics;
}

// ─── SSH Python 语法检查 ────────────────────────────────────────────────────────

async function checkPythonSyntaxViaSSH(
  code: string,
  filePath: string
): Promise<CodeDiagnostic[]> {
  if (!sshService.isConnected) {
    return [];
  }

  try {
    // Write code to a temp file on the device, then use py_compile
    const tmpFile = `/tmp/cc_lint_${Date.now()}.py`;
    // Escape the code for shell: use base64 to avoid quoting issues
    // We'll write the file using printf with hex encoding
    const b64 = btoa(unescape(encodeURIComponent(code)));
    await sshService.exec(
      `echo '${b64}' | base64 -d > '${tmpFile}' 2>/dev/null`
    );

    // Run py_compile and capture stderr
    const result = await sshService.exec(
      `python3 -c "import py_compile, sys; py_compile.compile('${tmpFile}', doraise=True)" 2>&1; rm -f '${tmpFile}'`
    );

    if (!result || result.trim() === '') {
      return []; // No errors
    }

    // Parse Python error output
    // Format: "  File "/tmp/...", line N\n    code\nSyntaxError: message"
    const diagnostics: CodeDiagnostic[] = [];
    const lineMatch = result.match(/line (\d+)/i);
    const errorMatch = result.match(/(SyntaxError|IndentationError|TabError):\s*(.+)/i);

    if (errorMatch) {
      const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : 1;
      const rawMsg = errorMatch[2].trim();
      const chineseMsg = translatePythonError(rawMsg);
      diagnostics.push({
        line: lineNum,
        column: 1,
        message: chineseMsg,
        type: 'error',
      });
    }

    return diagnostics;
  } catch (err) {
    // SSH check failed silently
    return [];
  }
}

/**
 * 高级代码编辑器组件
 * 功能：行号显示、语法检查（SSH Python / 括号平衡）、中文错误提示
 */
export function AdvancedCodeEditor({
  value,
  onChangeText,
  language = 'text',
  filePath = '',
  colors,
  style,
}: AdvancedCodeEditorProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<CodeDiagnostic[]>([]);
  const [checking, setChecking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const lintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPython = language === 'py' || language === 'python';
  const isJS = ['js', 'ts', 'tsx', 'jsx'].includes(language);

  // 更新行数
  useEffect(() => {
    setLines(value.split('\n'));
  }, [value]);

  // 防抖语法检查
  const scheduleLint = useCallback((code: string) => {
    if (lintTimerRef.current) clearTimeout(lintTimerRef.current);
    lintTimerRef.current = setTimeout(async () => {
      if (isPython && sshService.isConnected) {
        setChecking(true);
        try {
          const results = await checkPythonSyntaxViaSSH(code, filePath);
          setDiagnostics(results);
        } finally {
          setChecking(false);
        }
      } else if (isJS) {
        const results = checkBracketBalance(code);
        setDiagnostics(results);
      } else {
        setDiagnostics([]);
      }
    }, 800); // 800ms debounce
  }, [isPython, isJS, filePath]);

  useEffect(() => {
    scheduleLint(value);
    return () => {
      if (lintTimerRef.current) clearTimeout(lintTimerRef.current);
    };
  }, [value, scheduleLint]);

  const lineNumbers = lines.map((_, i) => (i + 1).toString());
  const maxLineNumberWidth = Math.max(lineNumbers.length.toString().length * 8 + 12, 28);

  const errorLines = new Set(diagnostics.map(d => d.line));

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollViewRef}
        scrollEnabled
        scrollEventThrottle={16}
        style={styles.scrollContainer}
      >
        <View style={styles.editorWrapper}>
          {/* 行号列 */}
          <View
            style={[
              styles.lineNumbers,
              {
                width: maxLineNumberWidth,
                backgroundColor: colors.surface,
                borderRightColor: colors.border,
              },
            ]}
          >
            {lineNumbers.map((num, idx) => {
              const lineNum = idx + 1;
              const hasError = errorLines.has(lineNum);
              return (
                <Text
                  key={idx}
                  style={[
                    styles.lineNumber,
                    {
                      color: hasError ? colors.error : colors.muted,
                      height: 20,
                      lineHeight: 20,
                    },
                  ]}
                >
                  {num}
                </Text>
              );
            })}
          </View>

          {/* 代码编辑区 */}
          <View style={styles.editorContent}>
            {/* 错误行高亮 */}
            {diagnostics.map((d, idx) => (
              <View
                key={idx}
                style={[
                  styles.errorLineHighlight,
                  {
                    top: (d.line - 1) * 20 + 12, // paddingTop offset
                    backgroundColor:
                      d.type === 'error'
                        ? colors.error + '22'
                        : (colors.warning || '#FFA500') + '22',
                  },
                ]}
              />
            ))}

            {/* 文本输入 */}
            <TextInput
              ref={textInputRef}
              style={[
                styles.editor,
                {
                  color: colors.foreground,
                  backgroundColor: colors.background,
                  fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                },
              ]}
              value={value}
              onChangeText={onChangeText}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              scrollEnabled={false}
              textAlignVertical="top"
              editable
            />
          </View>
        </View>
      </ScrollView>

      {/* 状态栏 / 错误提示面板 */}
      <View
        style={[
          styles.statusBar,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        {checking ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.statusText, { color: colors.muted }]}>正在检查语法...</Text>
          </View>
        ) : diagnostics.length === 0 ? (
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: colors.success || '#22C55E' }]} />
            <Text style={[styles.statusText, { color: colors.muted }]}>
              {isPython && sshService.isConnected
                ? '语法正确'
                : isJS
                ? '括号匹配正常'
                : `${lines.length} 行`}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.errorList} scrollEnabled>
            {diagnostics.slice(0, 5).map((d, idx) => (
              <View key={idx} style={styles.errorItem}>
                <View
                  style={[
                    styles.errorDot,
                    {
                      backgroundColor:
                        d.type === 'error' ? colors.error : colors.warning || '#FFA500',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.errorText,
                    {
                      color:
                        d.type === 'error' ? colors.error : colors.warning || '#FFA500',
                    },
                  ]}
                >
                  第 {d.line} 行：{d.message}
                </Text>
              </View>
            ))}
            {diagnostics.length > 5 && (
              <Text style={[styles.errorText, { color: colors.muted }]}>
                还有 {diagnostics.length - 5} 个问题...
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  scrollContainer: {
    flex: 1,
  },
  editorWrapper: {
    flexDirection: 'row',
    minHeight: '100%',
  },
  lineNumbers: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 4,
    borderRightWidth: 1,
  },
  lineNumber: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  editorContent: {
    flex: 1,
    position: 'relative',
  },
  errorLineHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 20,
    zIndex: 0,
  },
  editor: {
    flex: 1,
    padding: 12,
    fontSize: 13,
    lineHeight: 20,
    zIndex: 1,
  },
  statusBar: {
    borderTopWidth: 1,
    minHeight: 32,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  errorList: {
    maxHeight: 88,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 6,
  },
  errorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
    flexShrink: 0,
  },
  errorText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    flex: 1,
    lineHeight: 16,
  },
});
