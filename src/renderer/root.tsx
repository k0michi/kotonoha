import * as React from 'react';
import {
  Routes,
  Route,
} from "react-router-dom";
import EditPage from './pages/edit-page';
import IndexPage from './pages/index-page';
import StudyPage from './pages/study-page';

export default function Root() {
  return (
    <Routes>
      <Route index element={<IndexPage />} />
      <Route path="study/:id" element={<StudyPage />} />
      <Route path="edit/:id" element={<EditPage />} />
    </Routes>
  );
}