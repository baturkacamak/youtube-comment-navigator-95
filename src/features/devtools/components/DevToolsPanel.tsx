import React, { useEffect, useMemo, useState } from 'react';
import { devToolsStore, DevLogEntry } from '../devToolsStore';
import { ClipboardIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const levelClassMap: Record<DevLogEntry['level'], string> = {
  debug: 'text-slate-600 dark:text-slate-300',
  info: 'text-sky-700 dark:text-sky-300',
  warn: 'text-amber-700 dark:text-amber-300',
  error: 'text-red-700 dark:text-red-300',
  success: 'text-emerald-700 dark:text-emerald-300',
};

const formatData = (data: unknown): string => {
  if (typeof data === 'undefined') {
    return '';
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

const toConsoleLine = (entry: DevLogEntry): string => {
  const parts = [
    `[${new Date(entry.timestamp).toLocaleTimeString()}]`,
    `[${entry.level.toUpperCase()}]`,
    `[${entry.scope}]`,
    entry.message,
  ];

  const data = formatData(entry.data);
  return data ? `${parts.join(' ')}\n${data}` : parts.join(' ');
};

const DevToolsPanel: React.FC = () => {
  const [entries, setEntries] = useState<DevLogEntry[]>(() => devToolsStore.getEntries());
  const [search, setSearch] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => devToolsStore.subscribe(setEntries), []);

  const filteredEntries = useMemo(() => {
    if (!search.trim()) {
      return entries;
    }

    const term = search.toLowerCase();
    return entries.filter((entry) => {
      const haystack = `${entry.scope} ${entry.message} ${formatData(entry.data)}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [entries, search]);

  const copyVisibleLogs = async () => {
    const text = filteredEntries
      .slice()
      .reverse()
      .map((entry) => toConsoleLine(entry))
      .join('\n\n');

    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopySuccess(true);
    window.setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="w-full">
      <div className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Dev Panel</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              URL change, transcript and fetch diagnostics. Logs stay until Clear.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyVisibleLogs}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900"
            >
              {copySuccess ? (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <ClipboardIcon className="h-4 w-4" />
                  Copy Console
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => devToolsStore.clear()}
              className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="p-3 border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search logs"
              className="w-full rounded-md border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
            <div className="text-[11px] whitespace-nowrap text-slate-500 dark:text-slate-400">
              {filteredEntries.length} / {entries.length}
            </div>
          </div>
        </div>
        <div className="overflow-auto p-3 space-y-3 bg-slate-100 dark:bg-slate-950 max-h-[65vh]">
          {filteredEntries.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">No log entries.</div>
          ) : (
            filteredEntries
              .slice()
              .reverse()
              .map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div
                      className={`text-xs font-semibold uppercase ${levelClassMap[entry.level]}`}
                    >
                      {entry.level}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {entry.scope}
                  </div>
                  <div className="text-sm text-slate-900 dark:text-slate-100 mt-1">
                    {entry.message}
                  </div>
                  {typeof entry.data !== 'undefined' && (
                    <pre className="mt-2 text-[11px] leading-5 whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300 font-mono">
                      {formatData(entry.data)}
                    </pre>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DevToolsPanel;
