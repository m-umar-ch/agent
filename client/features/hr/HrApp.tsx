import { useState } from 'react';
import { HrInstructionsPage } from './HrInstructionsPage';
import { HrKeyGate } from './HrKeyGate';

const HR_API_KEY_STORAGE_KEY = 'handbook-hr-api-key';

export function HrApp() {
  const [apiKey, setApiKey] = useState(() => {
    try {
      return sessionStorage.getItem(HR_API_KEY_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });

  function startSession(key: string) {
    try {
      sessionStorage.setItem(HR_API_KEY_STORAGE_KEY, key);
    } catch {
      // Continue with an in-memory session when storage is unavailable.
    }
    setApiKey(key);
  }

  function endSession() {
    try {
      sessionStorage.removeItem(HR_API_KEY_STORAGE_KEY);
    } catch {
      // The in-memory state still ends the session.
    }
    setApiKey('');
  }

  if (!apiKey) {
    return <HrKeyGate onUnlock={startSession} />;
  }

  return <HrInstructionsPage apiKey={apiKey} onEndSession={endSession} />;
}
