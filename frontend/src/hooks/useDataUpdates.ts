import { useEffect, useState } from 'react';

const listenersByTopic = new Map<string, Set<() => void>>();

export function notifyDataUpdates(topic: string) {
  listenersByTopic.get(topic)?.forEach((listener) => {
    listener();
  });
}

export default function useDataUpdates(topic: string) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const listeners = listenersByTopic.get(topic) ?? new Set<() => void>();
    listenersByTopic.set(topic, listeners);
    const listener = () => setRevision((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        listenersByTopic.delete(topic);
      }
    };
  }, [topic]);
  return revision;
}
