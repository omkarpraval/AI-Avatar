import { SplitLayout } from '../components/layout/SplitLayout';
import { DocumentViewer } from '../components/document/DocumentViewer';
import { ChatPanel } from '../components/chat/ChatPanel';

export function StudyRoom() {
  return (
    <SplitLayout
      left={<DocumentViewer />}
      right={<ChatPanel />}
    />
  );
}

