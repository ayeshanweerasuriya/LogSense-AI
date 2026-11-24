const logs = [];

export function addLog(log) {
  logs.push(log);

  return log;
}

export function addLogs(newLogs) {
  logs.push(...newLogs);

  return newLogs;
}

export function getLogs() {
  return logs;
}

export function getLogStats() {
  const stats = {
    total: logs.length,
    INFO: 0,
    WARN: 0,
    ERROR: 0
  };

  for (const log of logs) {
    if (Object.hasOwn(stats, log.level)) {
      stats[log.level]++;
    }
  }

  return stats;
}