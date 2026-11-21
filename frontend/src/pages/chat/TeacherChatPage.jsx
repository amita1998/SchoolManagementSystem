import ChatBoard from '../../components/chat/ChatBoard.jsx';

/** Teacher: one conversation per child with that child's parents. */
export default function TeacherChatPage() {
  return <ChatBoard mode="teacher" />;
}
