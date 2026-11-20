import MyLibraryPage from '../../components/library/MyLibraryPage.jsx';

/** Teachers borrow books too; the endpoint is the same, scoped to their own teacher row. */
export default function TeacherLibraryPage() {
  return <MyLibraryPage roleLabel="your teacher" />;
}
